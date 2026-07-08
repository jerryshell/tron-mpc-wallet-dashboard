<script setup lang="ts">
const route = useRoute();
const { network } = useTronNetwork();
const { formatDateTime } = useTimeSettings();

const walletId = route.params.id as string;
const txId = route.params.txId as string;

const {
  data: tx,
  status,
  refresh,
} = await useFetch(`/api/wallets/${walletId}/transactions/${txId}`, {
  lazy: true,
  query: { network },
});

const isLoading = computed(
  () => !tx.value && (status.value === "pending" || status.value === "idle"),
);

const isPending = computed(() => tx.value?.status === "pending");
const isFailed = computed(() => tx.value?.status === "failed");

const statusDisplay = computed(() =>
  tx.value
    ? getTransactionStatusDisplay(tx.value.status)
    : { text: "", color: "neutral", icon: "" },
);

const nuxtLoading = useLoadingIndicator();

const POLL_INTERVAL = 3000;
let pollTimer: ReturnType<typeof setInterval> | null = null;

function startPolling(refreshFn: () => void) {
  nuxtLoading.start();
  if (!pollTimer) pollTimer = setInterval(refreshFn, POLL_INTERVAL);
}

function stopPolling() {
  nuxtLoading.finish();
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

watchEffect(() => {
  if (tx.value?.status === "pending") {
    startPolling(refresh);
  } else {
    stopPolling();
  }
});

onUnmounted(() => {
  nuxtLoading.clear();
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
});

const networkLabel = computed(() => (tx.value?.network === "mainnet" ? "主网" : "Nile 测试网"));

const contractTypeLabel = computed(() => {
  if (tx.value?.contractType === "TransferContract") return "TRX 转账";
  if (tx.value?.contractType === "TriggerSmartContract") return "USDT 转账";
  if (tx.value?.token === "USDT") return "USDT 转账";
  if (tx.value?.token === "TRX") return "TRX 转账";
  return "-";
});

const blockTimestampDisplay = computed(() => {
  if (!tx.value?.blockTimestamp) return undefined;
  return formatDateTime(tx.value.blockTimestamp);
});

function feeToTrx(value: number | undefined): number | null {
  if (value == null) return null;
  return value / 1e6;
}

const feeInTrx = computed(() => feeToTrx(tx.value?.fee));
const energyFeeInTrx = computed(() => feeToTrx(tx.value?.energyFee));
const bandwidthFeeInTrx = computed(() => feeToTrx(tx.value?.bandwidthFee));
</script>

<template>
  <UDashboardPanel id="tx-detail">
    <template #header>
      <UDashboardNavbar title="交易详情">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            @click="
              () => {
                navigateTo(`/wallets/${walletId}`);
              }
            "
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <Spinner v-if="isLoading" text="加载中..." />

      <template v-else-if="tx">
        <UPageCard variant="subtle" class="mb-4">
          <div class="flex flex-col items-center py-4">
            <div
              class="size-12 rounded-full flex items-center justify-center mb-3"
              :class="`bg-${statusDisplay.color}/10 text-${statusDisplay.color}`"
            >
              <UIcon
                :name="statusDisplay.icon"
                class="size-7"
                :class="{ 'animate-spin': isPending }"
              />
            </div>
            <span class="text-sm font-medium mb-2" :class="`text-${statusDisplay.color}`">
              {{ statusDisplay.text }}
            </span>
            <div class="flex items-baseline gap-1.5">
              <span class="text-3xl font-bold">{{ formatAmount(tx.amount) }}</span>
              <span class="text-xl font-semibold text-muted">{{ tx.token }}</span>
            </div>
            <span class="text-sm text-dimmed mt-2">{{ formatDateTime(tx.createdAt) }}</span>
          </div>
        </UPageCard>

        <div v-if="isFailed && tx.revertMessage" class="mb-4">
          <UAlert
            color="error"
            variant="subtle"
            icon="i-lucide-circle-x"
            title="交易执行失败"
            :description="tx.revertMessage"
          />
        </div>

        <TransactionLifecycleCard
          :status="tx.status"
          :created-at="tx.createdAt"
          :block-timestamp="tx.blockTimestamp"
        />

        <AddressFlowCard :from="tx.from" :to="tx.to" :network="tx.network" />

        <TransactionDetailsCard
          :tx-id="tx.txId"
          :network="tx.network"
          :network-label="networkLabel"
          :contract-type-label="contractTypeLabel"
          :block-timestamp-display="blockTimestampDisplay"
          :block-number="tx.blockNumber"
        />

        <TransactionFeesCard
          :fee-in-trx="feeInTrx"
          :energy-fee-in-trx="energyFeeInTrx"
          :bandwidth-fee-in-trx="bandwidthFeeInTrx"
          :energy-usage="tx.energyUsage"
          :net-usage="tx.netUsage"
        />
      </template>

      <div v-else class="text-center py-12 text-muted">交易不存在</div>
    </template>
  </UDashboardPanel>
</template>
