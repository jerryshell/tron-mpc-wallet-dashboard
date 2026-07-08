export const useTronNetwork = createSharedComposable(() => {
  const network = ref<"mainnet" | "nile">("nile");
  const refreshing = ref(false);
  let refreshTimer: ReturnType<typeof setTimeout> | null = null;

  function triggerRefresh() {
    refreshing.value = true;
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
      refreshing.value = false;
    }, 800);
  }

  const networkLabel = computed(() => {
    return network.value === "mainnet" ? "主网" : "Nile 测试网";
  });

  const networkColor = computed(() => {
    return network.value === "mainnet" ? "success" : "warning";
  });

  function getNetworkConfig() {
    return {
      mainnet: {
        fullHost: "https://api.trongrid.io",
        label: "主网",
      },
      nile: {
        fullHost: "https://nile.trongrid.io",
        label: "Nile 测试网",
      },
    }[network.value];
  }

  return {
    network,
    networkLabel,
    networkColor,
    refreshing,
    triggerRefresh,
    getNetworkConfig,
  };
});
