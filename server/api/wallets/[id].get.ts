import { findById } from "../../db/index";
import { getTrxBalance, getUsdtBalance, getAccountResources } from "../../services/tron";
import { logger } from "../../utils/logger";
import { getWalletParams } from "../../utils/wallet-params";

export default defineEventHandler(async (event) => {
  const { id, network } = getWalletParams(event);

  logger.info("获取钱包详情", { id, network });

  const wallet = await findById("wallets", id);
  if (!wallet) {
    throw createError({ statusCode: 404, message: "钱包不存在" });
  }

  try {
    const [trx, usdt, resources] = await Promise.all([
      getTrxBalance(wallet.tronAddress, network),
      getUsdtBalance(wallet.tronAddress, network),
      getAccountResources(wallet.tronAddress, network),
    ]);

    return {
      ...wallet,
      balances: {
        trx: trx.trx,
        trxSun: trx.sun,
        usdt: usdt.usdt,
        usdtRaw: usdt.raw,
      },
      resources,
    };
  } catch (error) {
    logger.error("查询钱包详情失败", { id, error: String(error) });
    return {
      ...wallet,
      balances: { trx: "0", trxSun: "0", usdt: "0", usdtRaw: "0" },
      resources: {
        bandwidth: { freeNetLimit: 0, freeNetUsed: 0, netLimit: 0, netUsed: 0 },
        energy: { energyLimit: 0, energyUsed: 0 },
      },
    };
  }
});
