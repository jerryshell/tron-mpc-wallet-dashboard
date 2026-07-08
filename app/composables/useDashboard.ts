import { createSharedComposable } from "@vueuse/core";

const _useDashboard = () => {
  const router = useRouter();

  defineShortcuts({
    "g-h": () => router.push("/"),
    "g-w": () => router.push("/wallets"),
  });
};

export const useDashboard = createSharedComposable(_useDashboard);
