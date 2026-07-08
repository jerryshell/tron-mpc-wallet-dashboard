import { findAll } from "../../db/index";
import { getTrxBalance, getUsdtBalance, type TronNetwork } from "../../services/tron";
import { logger } from "../../utils/logger";

export default defineEventHandler(async (event) => {
  const network = (getQuery(event).network || "nile") as TronNetwork;
  logger.info("列出所有钱包", { network });

  const wallets = await findAll("wallets");
  logger.info("数据库查询完成", { count: wallets.length });

  const walletsWithBalance = await Promise.all(
    wallets.map(async (w) => {
      try {
        const [trx, usdt] = await Promise.all([
          getTrxBalance(w.tronAddress, network),
          getUsdtBalance(w.tronAddress, network),
        ]);

        return {
          ...w,
          balances: {
            trx: trx.trx,
            usdt: usdt.usdt,
          },
        };
      } catch (error) {
        logger.warn("查询余额失败", {
          walletId: w.mpcWalletId,
          address: w.tronAddress,
          error: String(error),
        });
        return {
          ...w,
          balances: { trx: "0", usdt: "0" },
        };
      }
    }),
  );

  return walletsWithBalance;
});
