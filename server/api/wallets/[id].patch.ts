import { findById, updateField } from "../../db/index";
import { logger } from "../../utils/logger";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");

  if (!id) {
    throw createError({ statusCode: 400, message: "缺少钱包ID" });
  }

  const body = await readBody(event);
  const remark = typeof body.remark === "string" ? body.remark : undefined;

  if (remark === undefined) {
    throw createError({ statusCode: 400, message: "缺少备注内容" });
  }

  logger.info("更新钱包备注", { id, remark });

  const wallet = await findById("wallets", id);
  if (!wallet) {
    throw createError({ statusCode: 404, message: "钱包不存在" });
  }

  await updateField("wallets", id, "remark", remark);

  logger.info("钱包备注已更新", { id });
  return { success: true };
});
