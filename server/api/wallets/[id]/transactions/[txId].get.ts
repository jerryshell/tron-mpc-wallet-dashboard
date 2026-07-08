import { findById } from "../../../../db/index";
import { getUnifiedTransactionDetail } from "../../../../services/tron";
import { logger } from "../../../../utils/logger";
import { getWalletParams } from "../../../../utils/wallet-params";

export default defineEventHandler(async (event) => {
  const { id, network } = getWalletParams(event);
  const txId = getRouterParam(event, "txId");

  if (!txId) {
    throw createError({ statusCode: 400, message: "缺少参数" });
  }

  const wallet = await findById("wallets", id);
  if (!wallet) {
    throw createError({ statusCode: 404, message: "钱包不存在" });
  }

  const transaction = await getUnifiedTransactionDetail(txId, wallet.id as string, network);

  if (!transaction) {
    logger.warn("交易不存在", { txId, walletId: id });
    throw createError({ statusCode: 404, message: "交易不存在" });
  }

  return transaction;
});
