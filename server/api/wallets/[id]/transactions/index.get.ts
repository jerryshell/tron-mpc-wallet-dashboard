import { findById } from "../../../../db/index";
import { getTransactionsFromAddress, toUnifiedTransaction } from "../../../../services/tron";
import { logger } from "../../../../utils/logger";
import { getWalletParams } from "../../../../utils/wallet-params";

export default defineEventHandler(async (event) => {
  const { id, network } = getWalletParams(event);

  const wallet = await findById("wallets", id);
  if (!wallet) {
    throw createError({ statusCode: 404, message: "钱包不存在" });
  }

  const chainTxs = await getTransactionsFromAddress(wallet.tronAddress as string, network, {
    limit: 50,
  }).catch((e) => {
    logger.warn("查询链上交易失败", { walletId: id, network, error: String(e) });
    return [];
  });

  const transactions = chainTxs.map((tx) => toUnifiedTransaction(tx, wallet.id as string, network));

  logger.info("查询链上交易历史", { walletId: id, network, count: transactions.length });

  return transactions;
});
