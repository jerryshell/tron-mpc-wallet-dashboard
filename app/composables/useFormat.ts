export function truncateMiddle(str: string, prefix = 8, suffix = 8): string {
  if (!str) return "";
  if (str.length <= prefix + suffix + 3) return str;
  return str.slice(0, prefix) + "..." + str.slice(-suffix);
}

export function copyToClipboard(text: string, label = "已复制") {
  navigator.clipboard.writeText(text);
  const toast = useToast();
  toast.add({ title: label, color: "success" });
}

export function formatAmount(value: string | number | null | undefined): string {
  if (value == null) return "0";
  const num = Number(value);
  if (isNaN(num)) return "0";
  return num.toLocaleString("en-US", {
    maximumFractionDigits: 6,
    minimumFractionDigits: 0,
  });
}
