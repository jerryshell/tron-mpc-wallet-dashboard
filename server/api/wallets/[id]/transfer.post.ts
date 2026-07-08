import { findById } from "../../../db/index";
import {
  buildUnsignedTrxTransfer,
  buildUnsignedUsdtTransfer,
  extractTxId,
  attachSignature,
  broadcast,
  getTrxBalance,
  getUsdtBalance,
  estimateTrc20Fee,
  type TronNetwork,
} from "../../../services/tron";
import { signWithMpc } from "../../../services/mpc";
import { acquireWalletLock } from "../../../services/transfer-lock";
import { logger } from "../../../utils/logger";
import { TronWeb } from "tronweb";

function validateTransferParams(
  id: string | undefined,
  to: string,
  amount: number,
  token: string,
  network: string,
) {
  if (!id) {
    throw createError({ statusCode: 400, message: "缺少钱包ID" });
  }
  if (!to || !amount || !token || !network) {
    throw createError({ statusCode: 400, message: "缺少必要参数: to, amount, token, network" });
  }
  if (token !== "TRX" && token !== "USDT") {
    throw createError({ statusCode: 400, message: "token 必须是 TRX 或 USDT" });
  }
  if (!TronWeb.isAddress(to)) {
    throw createError({ statusCode: 400, message: "目标地址格式无效" });
  }
  if (isNaN(amount) || amount <= 0) {
    throw createError({ statusCode: 400, message: "金额必须大于 0" });
  }
}

async function checkUsdtBalance(from: string, amountNum: number, net: TronNetwork) {
  const trxBalance = await getTrxBalance(from, net);
  const estimatedFee = await estimateTrc20Fee(from, net);

  if (Number(trxBalance.sun) < estimatedFee) {
    throw createError({
      statusCode: 400,
      message: `TRX 余额不足支付手续费。需要约 ${(estimatedFee / 1e6).toFixed(6)} TRX，当前余额 ${trxBalance.trx} TRX`,
    });
  }

  const usdtBalance = await getUsdtBalance(from, net);
  if (Number(usdtBalance.raw) < Math.floor(amountNum * 1e6)) {
    throw createError({
      statusCode: 400,
      message: `USDT 余额不足。需要 ${amountNum.toFixed(6)} USDT，当前余额 ${usdtBalance.usdt} USDT`,
    });
  }
}

async function checkTrxBalance(from: string, amountNum: number, net: TronNetwork) {
  const amountRaw = Math.floor(amountNum * 1e6);
  const estimatedFee = 1_000_000;
  const trxBalance = await getTrxBalance(from, net);

  if (Number(trxBalance.sun) < amountRaw + estimatedFee) {
    throw createError({
      statusCode: 400,
      message: `TRX 余额不足。需要约 ${((amountRaw + estimatedFee) / 1e6).toFixed(6)} TRX，当前余额 ${trxBalance.trx} TRX`,
    });
  }
}

async function checkSufficientBalance(
  from: string,
  token: string,
  amountNum: number,
  net: TronNetwork,
) {
  if (token === "USDT") {
    await checkUsdtBalance(from, amountNum, net);
  } else {
    await checkTrxBalance(from, amountNum, net);
  }
}

async function executeTransfer(
  wallet: any,
  from: string,
  to: string,
  amountRaw: number,
  amountNum: number,
  token: string,
  net: TronNetwork,
): Promise<{ txId: string }> {
  const tx =
    token === "TRX"
      ? await buildUnsignedTrxTransfer(from, to, amountRaw, net)
      : await buildUnsignedUsdtTransfer(from, to, amountRaw, net);

  let txId = extractTxId(tx);

  logger.info("发送签名请求到MPC", { txId });

  const { r, s, recovery } = await signWithMpc(wallet.mpcWalletId, txId);

  await checkSufficientBalance(from, token, amountNum, net);

  const signedTx = attachSignature(tx, r, s, recovery);

  const result = await broadcast(signedTx, net);
  const finalTxId = result.txid || txId;

  logger.info("转账广播成功", { txId: finalTxId, token, amount: String(amountNum) });

  return { txId: finalTxId };
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  const body = await readBody(event);
  const { to, amount, token, network } = body;
  const amountNum = Number(amount);
  const net = network as TronNetwork;

  validateTransferParams(id, to, amountNum, token, network);

  logger.info("开始转账", { walletId: id, to, amount, token, network: net });

  const wallet = await findById("wallets", id!);
  if (!wallet) {
    throw createError({ statusCode: 404, message: "钱包不存在" });
  }

  const from = wallet.tronAddress;
  const amountRaw = Math.floor(amountNum * 1e6);

  const releaseLock = await acquireWalletLock(wallet.mpcWalletId);

  await checkSufficientBalance(from, token, amountNum, net);

  try {
    const { txId } = await executeTransfer(wallet, from, to, amountRaw, amountNum, token, net);

    return {
      success: true,
      txId,
      status: "pending",
    };
  } catch (error) {
    logger.error("转账失败", { walletId: id, to, amount, token, error: String(error) });

    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : "转账失败",
    });
  } finally {
    releaseLock();
  }
});
