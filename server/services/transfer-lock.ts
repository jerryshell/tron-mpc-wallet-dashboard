import { logger } from "../utils/logger";

const walletLocks = new Map<string, Promise<void>>();

export async function acquireWalletLock(walletId: string): Promise<() => void> {
  let waited = false;

  while (walletLocks.has(walletId)) {
    if (!waited) {
      logger.info("钱包转账排队等待", { walletId });
      waited = true;
    }
    await walletLocks.get(walletId);
  }

  if (waited) {
    logger.info("钱包转账锁已获取", { walletId });
  }

  let release: () => void;
  const lockPromise = new Promise<void>((resolve) => {
    release = resolve;
  });

  walletLocks.set(walletId, lockPromise);

  return () => {
    walletLocks.delete(walletId);
    release!();
  };
}
