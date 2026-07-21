import { findAll } from "../../db/index";
import { updateField } from "../../db/index";
import { publicKeyToTronAddress } from "../../utils/tron-address";
import { logger } from "../../utils/logger";

interface VerifyResult {
  id: string;
  remark: string;
  storedAddress: string;
  derivedAddress: string;
  isValid: boolean;
  fixed: boolean;
}

export default defineEventHandler(async (event) => {
  logger.info("开始批量验证所有钱包地址");

  const wallets = await findAll("wallets");
  const results: VerifyResult[] = [];
  let fixedCount = 0;

  for (const wallet of wallets) {
    if (!wallet.ecdsaPubKey) {
      results.push({
        id: wallet.id,
        remark: wallet.remark || "-",
        storedAddress: wallet.tronAddress,
        derivedAddress: "",
        isValid: false,
        fixed: false,
      });
      continue;
    }

    try {
      const derivedAddress = publicKeyToTronAddress(wallet.ecdsaPubKey);
      const isValid = derivedAddress === wallet.tronAddress;

      if (!isValid) {
        // 自动修复地址
        await updateField("wallets", wallet.id, "tronAddress", derivedAddress);
        fixedCount++;
        logger.info("地址已修复", {
          id: wallet.id,
          oldAddress: wallet.tronAddress,
          newAddress: derivedAddress,
        });
      }

      results.push({
        id: wallet.id,
        remark: wallet.remark || "-",
        storedAddress: wallet.tronAddress,
        derivedAddress,
        isValid,
        fixed: !isValid,
      });
    } catch (error) {
      logger.error("验证地址失败", { id: wallet.id, error: String(error) });
      results.push({
        id: wallet.id,
        remark: wallet.remark || "-",
        storedAddress: wallet.tronAddress,
        derivedAddress: "",
        isValid: false,
        fixed: false,
      });
    }
  }

  const total = results.length;
  const validCount = results.filter((r) => r.isValid).length;
  const invalidCount = results.filter((r) => !r.isValid).length;

  logger.info("地址验证完成", { total, validCount, invalidCount, fixedCount });

  return {
    total,
    validCount,
    invalidCount,
    fixedCount,
    results,
  };
});
