import { TronWeb } from "tronweb";
import { logger } from "../utils/logger";
import { serverConfig } from "../utils/runtime-config";

function getApiKey(): string {
  return serverConfig.trongridApiKey || "";
}

class ConcurrencyLimiter {
  private running = 0;
  private queue: (() => void)[] = [];

  constructor(private max: number) {}

  async acquire(): Promise<void> {
    if (this.running < this.max) {
      this.running++;
      return;
    }
    return new Promise((resolve) => {
      this.queue.push(resolve);
    });
  }

  release(): void {
    this.running--;
    const next = this.queue.shift();
    if (next) {
      this.running++;
      next();
    }
  }

  async wrap<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }
}

async function withRetry<T>(fn: () => Promise<T>, label: string, maxRetries = 3): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const msg = String(error);
      const is429 = msg.includes("429") || msg.includes("Too Many Requests");
      if (!is429 || attempt === maxRetries - 1) throw error;
      const delay = Math.pow(2, attempt) * 1000;
      logger.warn(`限流重试: ${label}`, { attempt: attempt + 1, delay });
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error("unreachable");
}

const tronLimiter = new ConcurrencyLimiter(5);

const networks = {
  mainnet: {
    tronGridBaseUrl: "https://api.trongrid.io",
    contractAddress: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
  },
  nile: {
    tronGridBaseUrl: "https://nile.trongrid.io",
    contractAddress: "TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf",
  },
} as const;

export type TronNetwork = keyof typeof networks;

export type TransactionStatus = "success" | "failed" | "pending";

const tronClients = new Map<string, any>();

function getTronClient(network: TronNetwork): any {
  const existing = tronClients.get(network);
  if (existing) return existing;

  const config = networks[network];
  logger.info("创建Tron客户端", { network, url: config.tronGridBaseUrl });

  const apiKey = getApiKey();

  const client = new TronWeb({
    fullHost: config.tronGridBaseUrl,
    privateKey: "01",
  });

  if (apiKey) {
    client.setHeader({ "TRON-PRO-API-KEY": apiKey });
    client.setFullNodeHeader({ "TRON-PRO-API-KEY": apiKey });
  }

  logger.info("Tron客户端headers检查", {
    fullNodeHeaders: client.fullNode?.headers,
    solidityNodeHeaders: client.solidityNode?.headers,
    apiKeySet: !!apiKey,
    serverConfigKey: serverConfig.trongridApiKey,
    envKey: serverConfig.trongridApiKey,
  });

  tronClients.set(network, client);
  return client;
}

export async function getTrxBalance(address: string, network: TronNetwork) {
  const tronWeb = getTronClient(network);
  try {
    const balanceSun = (await tronLimiter.wrap(() =>
      withRetry(() => tronWeb.trx.getBalance(address), `TRX余额 ${address}`),
    )) as any;
    logger.info("查询TRX余额", { address, network, balanceSun: balanceSun.toString() });
    return { sun: balanceSun.toString(), trx: TronWeb.fromSun(balanceSun as number) };
  } catch (error) {
    logger.error("查询TRX余额失败", { address, network, error: String(error) });
    throw error;
  }
}

export async function getUsdtBalance(address: string, network: TronNetwork) {
  const tronWeb = getTronClient(network);
  const { contractAddress } = networks[network];

  try {
    const raw = await tronLimiter.wrap(() =>
      withRetry(async () => {
        const contract = await tronWeb.contract().at(contractAddress);
        const balance = await contract.balanceOf(address).call();
        return TronWeb.toBigNumber(balance).toString();
      }, `USDT余额 ${address}`),
    );
    logger.info("查询USDT余额", { address, network, raw });
    return { raw, usdt: TronWeb.toBigNumber(raw).div(1e6).toString() };
  } catch (error) {
    logger.error("查询USDT余额失败", { address, network, error: String(error) });
    throw error;
  }
}

export async function getAccountResources(address: string, network: TronNetwork) {
  const tronWeb = getTronClient(network);

  try {
    const resources = (await tronLimiter.wrap(() =>
      withRetry(() => tronWeb.trx.getAccountResources(address), `账户资源 ${address}`),
    )) as any;

    const bandwidth = {
      freeNetLimit: resources.freeNetLimit ?? 0,
      freeNetUsed: resources.freeNetUsed ?? 0,
      netLimit: resources.NetLimit ?? 0,
      netUsed: resources.NetUsed ?? 0,
    };

    const energy = {
      energyLimit: resources.EnergyLimit ?? 0,
      energyUsed: resources.EnergyUsed ?? 0,
    };

    logger.info("查询账户资源", { address, network, bandwidth, energy });
    return { bandwidth, energy };
  } catch (error) {
    logger.error("查询账户资源失败", { address, network, error: String(error) });
    throw error;
  }
}

export async function buildUnsignedTrxTransfer(
  from: string,
  to: string,
  amountSun: number,
  network: TronNetwork,
) {
  const tronWeb = getTronClient(network);
  logger.info("构建TRX转账", { from, to, amountSun, network });

  const tx = await tronWeb.transactionBuilder.sendTrx(to, amountSun, from);
  return tx;
}

export async function buildUnsignedUsdtTransfer(
  from: string,
  to: string,
  amount: number,
  network: TronNetwork,
) {
  const tronWeb = getTronClient(network);
  const { contractAddress } = networks[network];
  logger.info("构建USDT转账", { from, to, amount, network, contractAddress });

  const tx = await tronWeb.transactionBuilder.triggerSmartContract(
    contractAddress,
    "transfer(address,uint256)",
    {},
    [
      { type: "address", value: to },
      { type: "uint256", value: String(amount) },
    ],
    from,
  );

  return tx;
}

function getInnerTx(tx: any): any {
  return tx.transaction || tx;
}

export function extractTxId(tx: any): string {
  const inner = getInnerTx(tx);
  const txId = inner.txID;
  logger.info("提取txID", { txId });
  if (!txId) {
    throw new Error("无法提取交易ID");
  }
  return txId;
}

export function attachSignature(tx: any, r: string, s: string, recovery: number) {
  const rPadded = r.padStart(64, "0");
  const sPadded = s.padStart(64, "0");
  const v = (recovery + 27).toString(16).padStart(2, "0");
  const signature = rPadded + sPadded + v;

  const inner = getInnerTx(tx);

  if (Array.isArray(inner.signature)) {
    inner.signature.push(signature);
  } else {
    inner.signature = [signature];
  }

  logger.info("签名已附加", { signatureLen: signature.length });
  return tx;
}

export async function broadcast(signedTx: any, network: TronNetwork) {
  const tronWeb = getTronClient(network);
  logger.info("广播交易", { network });

  const inner = getInnerTx(signedTx);
  const result = await tronWeb.trx.sendRawTransaction(inner);
  logger.info("交易广播成功", { result });
  return result;
}

export async function getTransactionInfo(txid: string, network: TronNetwork) {
  const tronWeb = getTronClient(network);
  logger.info("查询交易回执", { txid, network });

  try {
    const info = await tronWeb.trx.getTransactionInfo(txid);
    logger.info("交易回执结果", { txid, info });
    return info;
  } catch (error) {
    logger.error("查询交易回执失败", { txid, network, error: String(error) });
    throw error;
  }
}

const TRANSFER_EVENT_SIGNATURE = "ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

export function getUsdtContractAddress(network: TronNetwork): string {
  return networks[network].contractAddress;
}

function getUsdtContractHex(network: TronNetwork): string {
  return TronWeb.address.toHex(networks[network].contractAddress).toLowerCase();
}

export function parseTrc20TransferLog(
  txInfo: any,
  network: TronNetwork,
): { from: string; to: string; amount: string } | null {
  if (!Array.isArray(txInfo.log)) return null;

  const usdtContractHex = getUsdtContractHex(network).slice(2);

  for (const log of txInfo.log) {
    const logAddress = (log.address || "").toLowerCase();
    if (logAddress !== usdtContractHex) continue;

    const topics = log.topics || [];
    if (topics.length < 3) continue;
    if (topics[0].toLowerCase() !== TRANSFER_EVENT_SIGNATURE) continue;

    const amountHex = log.data || "";
    if (amountHex.length < 64) continue;

    const amount = BigInt("0x" + amountHex).toString();
    if (amount === "0") continue;

    const fromHex = "41" + topics[1].slice(-40);
    const toHex = "41" + topics[2].slice(-40);

    return {
      from: TronWeb.address.fromHex(fromHex),
      to: TronWeb.address.fromHex(toHex),
      amount,
    };
  }

  return null;
}

function getStatusFromRet(txInfo: any): TransactionStatus | null {
  if (!Array.isArray(txInfo.ret) || txInfo.ret.length === 0) return null;
  const contractRet = txInfo.ret[0].contractRet;
  if (contractRet === "SUCCESS") return "success";
  if (contractRet) {
    logger.warn("链上交易执行失败", { txInfo });
    return "failed";
  }
  return null;
}

function getSmartContractStatus(txInfo: any, network: TronNetwork): TransactionStatus | null {
  if (txInfo.receipt?.result !== "SUCCESS" || !txInfo.contract_address) return null;

  const usdtContractHex = getUsdtContractHex(network);
  const calledContract = (txInfo.contract_address || "").toLowerCase();

  if (calledContract !== usdtContractHex) return null;

  if (parseTrc20TransferLog(txInfo, network)) return "success";

  logger.warn("USDT 链上转账失败：无有效 Transfer event", { txId: txInfo.id });
  return "failed";
}

function getStatusFromReceipt(txInfo: any): TransactionStatus | null {
  if (!txInfo.receipt?.result || txInfo.receipt.result === "SUCCESS") return null;
  logger.warn("链上交易回执失败", { txInfo });
  return "failed";
}

export function getTransactionStatus(txInfo: any, network: TronNetwork): TransactionStatus {
  if (!txInfo || !txInfo.id) return "pending";

  return (
    getStatusFromRet(txInfo) ??
    getSmartContractStatus(txInfo, network) ??
    getStatusFromReceipt(txInfo) ??
    (txInfo.blockNumber ? "success" : "pending")
  );
}

export async function estimateTrc20Fee(
  senderAddress: string,
  network: TronNetwork,
): Promise<number> {
  const tronWeb = getTronClient(network);
  const { contractAddress } = networks[network];

  const [chainParams, energyResult] = await Promise.all([
    tronWeb.trx.getChainParameters(),
    tronWeb.transactionBuilder.estimateEnergy(
      contractAddress,
      "transfer(address,uint256)",
      {},
      [
        { type: "address", value: senderAddress },
        { type: "uint256", value: "1" },
      ],
      senderAddress,
    ),
  ]);

  let energyFee = 0;
  for (const param of chainParams) {
    if (param.key === "getEnergyFee") {
      energyFee = param.value ?? 0;
      break;
    }
  }

  if (energyFee === 0) {
    energyFee = network === "mainnet" ? 420 : 420;
    logger.warn("未能获取能量费率，使用默认值", { energyFee });
  }

  const energyRequired = (energyResult as any)?.energy_required ?? 0;
  const estimatedFee = Math.ceil(energyRequired * energyFee * 1.2);

  logger.info("估算USDT转账费用", { energyRequired, energyFee, estimatedFee });
  return estimatedFee;
}

export interface ChainTransaction {
  txId: string;
  type: "transfer";
  token: "TRX" | "USDT";
  from: string;
  to: string;
  amount: string;
  status: TransactionStatus;
  timestamp: number;
  blockNumber?: number;
  fee?: number;
}

async function fetchTronGrid(url: URL, label: string) {
  logger.info(label, { url: url.toString() });

  const headers: Record<string, string> = {};
  const apiKey = getApiKey();
  if (apiKey) headers["TRON-PRO-API-KEY"] = apiKey;

  const json = await tronLimiter.wrap(() =>
    withRetry(async () => {
      const response = await fetch(url.toString(), { headers });
      if (!response.ok) {
        throw new Error(`TronGrid API 错误: ${response.status}`);
      }
      return await response.json();
    }, label),
  );
  return json as { data?: any[] };
}

async function fetchTrc20Transfers(
  address: string,
  network: TronNetwork,
  options?: { limit?: number; onlyConfirmed?: boolean },
) {
  const config = networks[network];
  const url = new URL(`${config.tronGridBaseUrl}/v1/accounts/${address}/transactions/trc20`);
  if (options?.limit) url.searchParams.append("limit", String(options.limit));
  if (options?.onlyConfirmed !== undefined)
    url.searchParams.append("only_confirmed", String(options.onlyConfirmed));

  return fetchTronGrid(url, "查询链上 TRC20 转账");
}

async function fetchNativeTransfers(
  address: string,
  network: TronNetwork,
  options?: { limit?: number; offset?: number },
) {
  const config = networks[network];
  const url = new URL(`${config.tronGridBaseUrl}/v1/accounts/${address}/transactions`);
  if (options?.limit) url.searchParams.append("limit", String(options.limit));

  return fetchTronGrid(url, "查询链上 TRX 转账");
}

function getNativeTxStatus(tx: any): TransactionStatus {
  if (Array.isArray(tx.ret) && tx.ret.length > 0) {
    const contractRet = tx.ret[0].contractRet;
    if (contractRet === "SUCCESS") return "success";
    if (contractRet) return "failed";
  }
  return "pending";
}

function mapNativeTransaction(tx: any): ChainTransaction | null {
  const raw = tx.raw_data || tx;
  const contract = raw.contract?.[0];
  if (!contract || contract.type !== "TransferContract") return null;

  const value = contract.parameter?.value || {};
  if (!value.amount || Number(value.amount) === 0) return null;

  return {
    txId: tx.txID || tx.txId,
    type: "transfer",
    token: "TRX",
    from: value.owner_address ? TronWeb.address.fromHex(value.owner_address) : "",
    to: value.to_address ? TronWeb.address.fromHex(value.to_address) : "",
    amount: String(value.amount),
    status: getNativeTxStatus(tx),
    timestamp: Number(raw.timestamp || 0),
    blockNumber: tx.blockNumber,
    fee: tx.fee || tx.raw_data?.fee,
  };
}

function mapTrc20Transaction(tx: any, network: TronNetwork): ChainTransaction | null {
  if (tx.type !== "Transfer") return null;
  if (!tx.value || tx.value === "0") return null;

  const usdtContract = networks[network].contractAddress;
  const tokenAddress = tx.token_info?.address;
  if (tokenAddress && tokenAddress !== usdtContract) return null;
  if (tx.token_info?.symbol !== "USDT") return null;

  const status: TransactionStatus = tx.block_timestamp ? "success" : "pending";

  return {
    txId: tx.transaction_id,
    type: "transfer",
    token: "USDT",
    from: tx.from,
    to: tx.to,
    amount: String(tx.value),
    status,
    timestamp: Number(tx.block_timestamp || 0),
    blockNumber: tx.block_number,
  };
}

function mapValid<T, R>(items: T[], mapper: (item: T) => R | null): R[] {
  const result: R[] = [];
  for (const item of items) {
    const mapped = mapper(item);
    if (mapped) result.push(mapped);
  }
  return result;
}

function mergeTransferResults(
  nativeData: any[],
  trc20Data: any[],
  network: TronNetwork,
  limit: number,
): ChainTransaction[] {
  const native = mapValid(nativeData, mapNativeTransaction);
  const trc20 = mapValid(trc20Data, (tx) => mapTrc20Transaction(tx, network));

  const combined = [...native, ...trc20];
  combined.sort((a, b) => b.timestamp - a.timestamp);

  return combined.slice(0, limit);
}

export async function getTransactionsFromAddress(
  address: string,
  network: TronNetwork,
  options?: { limit?: number; onlyConfirmed?: boolean },
): Promise<ChainTransaction[]> {
  const limit = options?.limit ?? 20;
  const [nativeResult, trc20Result] = await Promise.all([
    fetchNativeTransfers(address, network, { limit }).catch((e) => {
      logger.warn("查询链上 TRX 转账失败", { address, network, error: String(e) });
      return { data: [] };
    }),
    fetchTrc20Transfers(address, network, {
      limit,
      onlyConfirmed: options?.onlyConfirmed,
    }).catch((e) => {
      logger.warn("查询链上 TRC20 转账失败", { address, network, error: String(e) });
      return { data: [] };
    }),
  ]);

  return mergeTransferResults(nativeResult.data || [], trc20Result.data || [], network, limit);
}

export async function getTransactionRaw(txid: string, network: TronNetwork) {
  const tronWeb = getTronClient(network);
  return await tronWeb.trx.getTransaction(txid);
}

export interface UnifiedTransaction {
  id: string;
  walletId: string;
  txId: string;
  type: "transfer";
  token: "TRX" | "USDT";
  from: string;
  to: string;
  amount: string;
  status: string;
  network: string;
  createdAt: number;
  updatedAt: number;
  blockNumber?: number;
  blockTimestamp?: number;
  fee?: number;
  energyFee?: number;
  bandwidthFee?: number;
  netUsage?: number;
  energyUsage?: number;
  revertMessage?: string;
  contractType?: "TransferContract" | "TriggerSmartContract";
}

function normalizeAmount(amount: string | number) {
  return String(Number(amount) / 1e6);
}

export function toUnifiedTransaction(
  chainTx: ChainTransaction,
  walletId: string,
  network: TronNetwork,
): UnifiedTransaction {
  return {
    id: chainTx.txId,
    walletId,
    txId: chainTx.txId,
    type: "transfer",
    token: chainTx.token,
    from: chainTx.from,
    to: chainTx.to,
    amount: normalizeAmount(chainTx.amount),
    status: chainTx.status,
    network,
    createdAt: chainTx.timestamp,
    updatedAt: chainTx.timestamp,
    blockNumber: chainTx.blockNumber,
    fee: chainTx.fee,
  };
}

function makeTransaction(params: {
  txId: string;
  walletId: string;
  token: "TRX" | "USDT";
  from?: string;
  to?: string;
  amount?: string;
  status: string;
  network: TronNetwork;
  timestamp: number;
  blockNumber?: number;
  blockTimestamp?: number;
  fee?: number;
  energyFee?: number;
  bandwidthFee?: number;
  netUsage?: number;
  energyUsage?: number;
  revertMessage?: string;
  contractType?: "TransferContract" | "TriggerSmartContract";
}): UnifiedTransaction {
  return {
    id: params.txId,
    walletId: params.walletId,
    txId: params.txId,
    type: "transfer",
    token: params.token,
    from: params.from ?? "",
    to: params.to ?? "",
    amount: params.amount ? normalizeAmount(params.amount) : "0",
    status: params.status,
    network: params.network,
    createdAt: params.timestamp,
    updatedAt: params.timestamp,
    blockNumber: params.blockNumber,
    blockTimestamp: params.blockTimestamp,
    fee: params.fee,
    energyFee: params.energyFee,
    bandwidthFee: params.bandwidthFee,
    netUsage: params.netUsage,
    energyUsage: params.energyUsage,
    revertMessage: params.revertMessage,
    contractType: params.contractType,
  };
}

function parseUsdtTransferFromData(value: any) {
  const data = value.data || "";
  // transfer(address,uint256) ABI encoding:
  // - 4 bytes (8 hex chars): selector 0xa9059cbb
  // - 32 bytes (64 hex chars): address (padded)
  // - 32 bytes (64 hex chars): amount
  // Total: 136 hex chars minimum
  if (data.length < 136) return null;
  const selector = data.slice(0, 8);
  if (selector !== "a9059cbb") return null;

  // Address is at bytes 4-36 (hex positions 8-72), last 20 bytes is the actual address
  const toHex = "41" + data.slice(32, 72);
  const to = TronWeb.address.fromHex(toHex);
  // Amount is at bytes 36-68 (hex positions 72-136)
  const amount = BigInt("0x" + data.slice(72, 136)).toString();

  return {
    from: value.owner_address ? TronWeb.address.fromHex(value.owner_address) : "",
    to,
    amount,
  };
}

function buildTrc20Result(
  txId: string,
  walletId: string,
  network: TronNetwork,
  chainInfo: any,
  value: any,
  timestamp: number,
  onChainStatus: string,
): UnifiedTransaction | null {
  const receipt = chainInfo?.receipt || {};
  const base = {
    txId,
    walletId,
    token: "USDT" as const,
    status: onChainStatus,
    network,
    timestamp,
    blockNumber: chainInfo?.blockNumber,
    blockTimestamp: chainInfo?.blockTimeStamp,
    fee: chainInfo?.fee,
    energyFee: receipt.energy_fee,
    bandwidthFee: receipt.net_fee,
    netUsage: receipt.net_usage,
    energyUsage: receipt.energy_usage_total,
    revertMessage: decodeRevertMessage(chainInfo?.resMessage),
    contractType: "TriggerSmartContract" as const,
  };

  if (chainInfo) {
    const log = parseTrc20TransferLog(chainInfo, network);
    if (log) {
      return makeTransaction({ ...base, from: log.from, to: log.to, amount: log.amount });
    }
  }

  const parsed = parseUsdtTransferFromData(value);
  if (!parsed) return null;

  return makeTransaction({ ...base, from: parsed.from, to: parsed.to, amount: parsed.amount });
}

function decodeRevertMessage(resMessage: string): string {
  if (!resMessage) return "";
  try {
    const hex = resMessage.startsWith("0x") ? resMessage.slice(2) : resMessage;
    if (!/^[0-9a-fA-F]*$/.test(hex)) return resMessage;
    const decoded = Buffer.from(hex, "hex").toString("utf8").trim();
    return decoded || resMessage;
  } catch {
    return resMessage;
  }
}

function makeBaseResult(
  txId: string,
  walletId: string,
  network: TronNetwork,
  status: string,
  chainInfo: any,
  timestamp: number,
) {
  const receipt = chainInfo?.receipt || {};
  return {
    txId,
    walletId,
    token: "TRX" as const,
    status,
    network,
    timestamp,
    blockNumber: chainInfo?.blockNumber,
    blockTimestamp: chainInfo?.blockTimeStamp,
    fee: chainInfo?.fee,
    energyFee: receipt.energy_fee,
    bandwidthFee: receipt.net_fee,
    netUsage: receipt.net_usage,
    energyUsage: receipt.energy_usage_total,
    revertMessage: decodeRevertMessage(chainInfo?.resMessage),
  };
}

function mapTransferContract(
  value: any,
  base: ReturnType<typeof makeBaseResult>,
): UnifiedTransaction {
  return makeTransaction({
    ...base,
    from: value.owner_address ? TronWeb.address.fromHex(value.owner_address) : undefined,
    to: value.to_address ? TronWeb.address.fromHex(value.to_address) : undefined,
    amount: value.amount || 0,
    contractType: "TransferContract",
  });
}

function mapTriggerSmartContract(
  value: any,
  base: { txId: string; walletId: string; network: TronNetwork; timestamp: number },
  chainInfo: any,
  onChainStatus: string,
): UnifiedTransaction | null {
  const contractAddress = value.contract_address
    ? TronWeb.address.fromHex(value.contract_address)
    : "";
  if (contractAddress !== getUsdtContractAddress(base.network)) return null;

  return buildTrc20Result(
    base.txId,
    base.walletId,
    base.network,
    chainInfo,
    value,
    base.timestamp,
    onChainStatus,
  );
}

async function mapChainTransactionToUnified(
  txId: string,
  walletId: string,
  network: TronNetwork,
  chainInfo: any,
  onChainStatus: string,
): Promise<UnifiedTransaction | null> {
  const chainRaw = await getTransactionRaw(txId, network).catch(() => null);
  const raw = chainRaw?.raw_data || chainInfo?.raw_data;
  const timestamp = raw?.timestamp || chainInfo?.blockTimeStamp || 0;

  if (!raw || !raw.contract?.[0]) {
    return makeTransaction(
      makeBaseResult(txId, walletId, network, onChainStatus, chainInfo, timestamp),
    );
  }

  const contract = raw.contract[0];
  const value = contract.parameter?.value || {};
  const base = { txId, walletId, network, timestamp };

  if (contract.type === "TransferContract") {
    return mapTransferContract(
      value,
      makeBaseResult(txId, walletId, network, onChainStatus, chainInfo, timestamp),
    );
  }

  if (contract.type === "TriggerSmartContract") {
    return mapTriggerSmartContract(value, base, chainInfo, onChainStatus);
  }

  return null;
}

export async function getUnifiedTransactionDetail(
  txId: string,
  walletId: string,
  network: TronNetwork,
): Promise<UnifiedTransaction | null> {
  const chainInfo = await getTransactionInfo(txId, network).catch(() => null);
  const onChainStatus = chainInfo ? getTransactionStatus(chainInfo, network) : "pending";
  return mapChainTransactionToUnified(txId, walletId, network, chainInfo, onChainStatus);
}
