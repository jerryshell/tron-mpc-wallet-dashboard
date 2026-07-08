<script setup lang="ts">
const props = defineProps<{
  txId: string;
  network: string;
  networkLabel: string;
  contractTypeLabel?: string;
  blockTimestampDisplay?: string;
  blockNumber?: number;
}>();

const toast = useToast();

function copyText(text: string) {
  navigator.clipboard.writeText(text);
  toast.add({ title: "已复制", color: "success" });
}

const explorerUrl = computed(() => {
  const base = props.network === "mainnet" ? "https://tronscan.org" : "https://nile.tronscan.org";
  return `${base}/#/transaction/${props.txId}`;
});
</script>

<template>
  <UPageCard variant="subtle" class="mb-4">
    <div class="space-y-4">
      <div>
        <div class="text-xs text-dimmed mb-1.5">TxID</div>
        <div class="bg-elevated/50 p-2.5 rounded-lg flex items-center gap-2">
          <span class="font-mono text-sm break-all">{{ txId }}</span>
          <div class="flex items-center gap-1 shrink-0">
            <UButton
              icon="i-lucide-copy"
              color="neutral"
              variant="ghost"
              size="xs"
              @click="copyText(txId)"
            />
            <UButton
              :to="explorerUrl"
              target="_blank"
              icon="i-lucide-external-link"
              color="neutral"
              variant="ghost"
              size="xs"
            />
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <div class="text-xs text-dimmed mb-1">网络</div>
          <div class="text-sm font-medium">{{ networkLabel }}</div>
        </div>

        <div>
          <div class="text-xs text-dimmed mb-1">类型</div>
          <div class="text-sm font-medium">{{ contractTypeLabel || "-" }}</div>
        </div>

        <div v-if="blockNumber">
          <div class="text-xs text-dimmed mb-1">区块高度</div>
          <div class="font-mono text-sm font-medium">{{ blockNumber }}</div>
        </div>

        <div v-if="blockTimestampDisplay">
          <div class="text-xs text-dimmed mb-1">区块时间</div>
          <div class="text-sm font-medium">{{ blockTimestampDisplay }}</div>
        </div>
      </div>
    </div>
  </UPageCard>
</template>
