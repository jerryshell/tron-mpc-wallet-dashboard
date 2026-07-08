import { create } from "../../db/index";
import { createMpcWallet } from "../../services/mpc";
import { publicKeyToTronAddress } from "../../utils/tron-address";
import { logger } from "../../utils/logger";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const remark = body.remark || "";

  logger.info("创建钱包", { remark });

  try {
    const { mpcWalletId, ecdsaPubKey, eddsaPubKey } = await createMpcWallet();

    const tronAddress = publicKeyToTronAddress(ecdsaPubKey);

    const wallet = await create("wallets", {
      mpcWalletId,
      remark,
      tronAddress,
      ecdsaPubKey,
      eddsaPubKey,
    });

    logger.info("钱包已保存到数据库", { mpcWalletId, tronAddress });
    return wallet;
  } catch (error) {
    logger.error("创建钱包失败", { remark, error: String(error) });
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : "创建钱包失败",
    });
  }
});
