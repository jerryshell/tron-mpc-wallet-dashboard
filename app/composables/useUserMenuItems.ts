import type { DropdownMenuItem } from "@nuxt/ui";

const colors = [
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose",
];
const neutrals = ["slate", "gray", "zinc", "neutral", "stone"];

const colorLabels: Record<string, string> = {
  red: "红色",
  orange: "橙色",
  amber: "琥珀色",
  yellow: "黄色",
  lime: "青柠色",
  green: "绿色",
  emerald: "翠绿色",
  teal: "蓝绿色",
  cyan: "青色",
  sky: "天蓝色",
  blue: "蓝色",
  indigo: "靛蓝色",
  violet: "紫罗兰色",
  purple: "紫色",
  fuchsia: "紫红色",
  pink: "粉色",
  rose: "玫瑰色",
};

const neutralLabels: Record<string, string> = {
  slate: "石板灰",
  gray: "灰色",
  zinc: "锌灰色",
  neutral: "中性灰",
  stone: "石头灰",
};

function buildColorPickerItems(
  colorList: string[],
  labels: Record<string, string>,
  currentColor: string,
  onSelect: (color: string) => void,
): DropdownMenuItem[] {
  return colorList.map((color) => ({
    label: `${labels[color]} (${color})`,
    chip: color,
    slot: "chip",
    checked: currentColor === color,
    type: "checkbox" as const,
    onSelect: (e: Event) => {
      e.preventDefault();
      onSelect(color);
    },
  }));
}

function buildCheckboxMenuItem(
  label: string,
  icon: string,
  checked: boolean,
  onSelect: (e: Event) => void,
): DropdownMenuItem {
  return {
    label,
    icon,
    type: "checkbox",
    checked,
    onSelect,
  };
}

export function useUserMenuItems(): ComputedRef<DropdownMenuItem[][]> {
  const colorMode = useColorMode();
  const appConfig = useAppConfig();
  const { timeMode, localTimezoneLabel } = useTimeSettings();

  return computed<DropdownMenuItem[][]>(() => [
    [
      {
        label: "主题",
        icon: "i-lucide-palette",
        children: [
          {
            label: "主题色",
            slot: "chip",
            chip: appConfig.ui.colors.primary,
            content: { align: "center" as const, collisionPadding: 16 },
            children: buildColorPickerItems(
              colors,
              colorLabels,
              appConfig.ui.colors.primary,
              (color) => {
                appConfig.ui.colors.primary = color;
              },
            ),
          },
          {
            label: "中性色",
            slot: "chip",
            chip:
              appConfig.ui.colors.neutral === "neutral"
                ? "old-neutral"
                : appConfig.ui.colors.neutral,
            content: { align: "end" as const, collisionPadding: 16 },
            children: buildColorPickerItems(
              neutrals,
              neutralLabels,
              appConfig.ui.colors.neutral,
              (color) => {
                appConfig.ui.colors.neutral = color;
              },
            ).map((item) => ({
              ...item,
              chip: item.chip === "neutral" ? "old-neutral" : item.chip,
            })),
          },
        ],
      },
      {
        label: "外观",
        icon: "i-lucide-sun-moon",
        children: [
          buildCheckboxMenuItem("浅色", "i-lucide-sun", colorMode.value === "light", (e) => {
            e.preventDefault();
            colorMode.preference = "light";
          }),
          buildCheckboxMenuItem("深色", "i-lucide-moon", colorMode.value === "dark", (e) => {
            e.preventDefault();
            colorMode.preference = "dark";
          }),
        ],
      },
      {
        label: "时区",
        icon: "i-lucide-clock",
        children: [
          buildCheckboxMenuItem(
            localTimezoneLabel.value,
            "i-lucide-map-pin",
            timeMode.value === "local",
            (e) => {
              e.preventDefault();
              timeMode.value = "local";
            },
          ),
          buildCheckboxMenuItem("UTC", "i-lucide-globe", timeMode.value === "utc", (e) => {
            e.preventDefault();
            timeMode.value = "utc";
          }),
        ],
      },
    ],
  ]);
}
