const POLL_INTERVAL = 15_000;

const isOnline = ref(false);
let pollingTimer: ReturnType<typeof setInterval> | null = null;

async function checkHealth() {
  try {
    const data = await $fetch("/api/mpc/health");
    isOnline.value = data.online;
  } catch {
    isOnline.value = false;
  }
}

function startPolling() {
  if (pollingTimer) return;
  pollingTimer = setInterval(checkHealth, POLL_INTERVAL);
  checkHealth();
}

export function useMpcHealth() {
  if (import.meta.client && !pollingTimer) {
    startPolling();
  }

  return { isOnline };
}
