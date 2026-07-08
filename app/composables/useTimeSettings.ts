export const useTimeSettings = createSharedComposable(() => {
  const timeMode = useCookie<"local" | "utc">("time-mode", { default: () => "local" });

  const timeModeLabel = computed(() => (timeMode.value === "utc" ? "UTC" : "本地"));

  const localTimezoneLabel = computed(() => {
    const offset = -new Date().getTimezoneOffset();
    const sign = offset >= 0 ? "+" : "-";
    const absMinutes = Math.abs(offset);
    const hours = Math.floor(absMinutes / 60);
    const mins = absMinutes % 60;
    const tz =
      mins > 0 ? `UTC${sign}${hours}:${String(mins).padStart(2, "0")}` : `UTC${sign}${hours}`;
    return `本地时间 (${tz})`;
  });

  const timeIcon = computed(() => (timeMode.value === "utc" ? "i-lucide-globe" : "i-lucide-clock"));

  function formatDateTime(timestamp: number | null | undefined): string {
    if (timestamp == null) return "-";
    const date = new Date(timestamp);
    if (timeMode.value === "utc") {
      const y = date.getUTCFullYear();
      const mo = String(date.getUTCMonth() + 1).padStart(2, "0");
      const d = String(date.getUTCDate()).padStart(2, "0");
      const h = String(date.getUTCHours()).padStart(2, "0");
      const mi = String(date.getUTCMinutes()).padStart(2, "0");
      const s = String(date.getUTCSeconds()).padStart(2, "0");
      return `${y}-${mo}-${d} ${h}:${mi}:${s} UTC`;
    }
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  }

  return { timeMode, timeModeLabel, localTimezoneLabel, timeIcon, formatDateTime };
});
