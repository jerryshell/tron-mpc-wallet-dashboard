export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomFrom<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]!;
}

const TIME_FORMAT_THRESHOLDS = [
  { max: 10, format: () => "刚刚" },
  { max: 60, format: (s: number) => `${s} 秒前` },
  { max: 3600, format: (s: number) => `${Math.floor(s / 60)} 分钟前` },
  { max: 86400, format: (s: number) => `${Math.floor(s / 3600)} 小时前` },
  { max: 2592000, format: (s: number) => `${Math.floor(s / 86400)} 天前` },
  { max: 31536000, format: (s: number) => `${Math.floor(s / 2592000)} 个月前` },
  { max: Infinity, format: (s: number) => `${Math.floor(s / 31536000)} 年前` },
];

export function formatTimeAgoZh(date: Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);

  for (const threshold of TIME_FORMAT_THRESHOLDS) {
    if (seconds < threshold.max) {
      return threshold.format(seconds);
    }
  }

  return "刚刚";
}

export function getTransactionStatusDisplay(status: string): {
  text: string;
  color: "success" | "error" | "warning";
  icon: string;
} {
  if (status === "success") {
    return { text: "成功", color: "success", icon: "i-lucide-circle-check" };
  }
  if (status === "pending") {
    return { text: "确认中", color: "warning", icon: "i-lucide-clock" };
  }
  return { text: "失败", color: "error", icon: "i-lucide-circle-x" };
}
