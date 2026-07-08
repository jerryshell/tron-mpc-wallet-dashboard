<script setup lang="ts">
const props = defineProps<{
  feeInTrx: number | null;
  energyFeeInTrx?: number | null;
  bandwidthFeeInTrx?: number | null;
  energyUsage?: number;
  netUsage?: number;
}>();

function feeLabel(value: number | null | undefined): string {
  if (value == null) return "-";
  return `${value.toFixed(6)} TRX`;
}

function formatNumber(value: number | undefined): string {
  if (value == null) return "-";
  return value.toLocaleString("en-US");
}

const items = computed(() => [
  { label: "总手续费", value: feeLabel(props.feeInTrx) },
  { label: "能量费用", value: feeLabel(props.energyFeeInTrx) },
  { label: "带宽费用", value: feeLabel(props.bandwidthFeeInTrx) },
  { label: "能量消耗", value: formatNumber(props.energyUsage) },
  { label: "带宽消耗", value: formatNumber(props.netUsage) },
]);
</script>

<template>
  <UPageCard title="费用与资源" variant="subtle" class="mb-4">
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
      <div v-for="item in items" :key="item.label" class="bg-elevated/50 rounded-lg p-3">
        <div class="text-xs text-dimmed mb-1">{{ item.label }}</div>
        <div class="font-mono text-sm font-medium">{{ item.value }}</div>
      </div>
    </div>
  </UPageCard>
</template>
