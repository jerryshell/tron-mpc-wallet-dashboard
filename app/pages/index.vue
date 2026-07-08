<script setup lang="ts">
const { network } = useTronNetwork();
const toast = useToast();

const {
  data: wallets,
  status: walletStatus,
  refresh,
} = await useFetch("/api/wallets", {
  query: { network },
  lazy: true,
});

watch(network, () => {
  refresh();
});

const statsLoading = computed(() => walletStatus.value === "pending" && !wallets.value);

const stats = computed(() => {
  const list = wallets.value ?? [];
  const trxTotal = list.reduce((sum, w) => sum + Number(w.balances?.trx || 0), 0);
  const usdtTotal = list.reduce((sum, w) => sum + Number(w.balances?.usdt || 0), 0);
  return { count: list.length, trxTotal, usdtTotal };
});

const createOpen = ref(false);
const creating = ref(false);

async function onCreateWallet(event: { remark?: string }) {
  creating.value = true;
  try {
    await $fetch("/api/wallets", {
      method: "POST",
      body: { remark: event.remark || "" },
    });
    createOpen.value = false;
    await refresh();
    toast.add({ title: "钱包创建成功", color: "success" });
  } catch (e: any) {
    toast.add({ title: "创建失败", description: e.message, color: "error" });
  } finally {
    creating.value = false;
  }
}
</script>

<template>
  <UDashboardPanel id="home">
    <template #header>
      <UDashboardNavbar title="仪表盘">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            label="创建钱包"
            icon="i-lucide-plus"
            @click="
              () => {
                createOpen = true;
              }
            "
          />
          <WalletFormModal
            v-model:open="createOpen"
            title="创建钱包"
            submit-label="创建"
            :loading="creating"
            show-mpc-warning
            @submit="onCreateWallet"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <UPageGrid class="lg:grid-cols-3 gap-4">
        <ResourceCard icon="i-lucide-wallet" title="钱包总数" :loading="statsLoading">
          {{ stats.count }}
        </ResourceCard>
        <ResourceCard icon="i-lucide-coins" title="TRX 总额" :loading="statsLoading">
          {{ formatAmount(stats.trxTotal) }}
        </ResourceCard>
        <ResourceCard icon="i-lucide-circle-dollar-sign" title="USDT 总额" :loading="statsLoading">
          {{ formatAmount(stats.usdtTotal) }}
        </ResourceCard>
      </UPageGrid>
    </template>
  </UDashboardPanel>
</template>
