<script setup lang="ts">
const props = defineProps<{
  from: string;
  to: string;
  network?: string;
}>();

const toast = useToast();

function copyText(text: string) {
  navigator.clipboard.writeText(text);
  toast.add({ title: "已复制", color: "success" });
}

function addressExplorerUrl(address: string) {
  const base = props.network === "mainnet" ? "https://tronscan.org" : "https://nile.tronscan.org";
  return `${base}/#/address/${address}`;
}
</script>

<template>
  <UPageCard variant="subtle" class="mb-4">
    <div class="py-1 space-y-1">
      <div class="flex items-center gap-3 py-2">
        <span class="text-xs text-dimmed shrink-0 w-12 text-right">发送方</span>
        <span class="font-mono text-sm break-all">{{ from }}</span>
        <div class="flex items-center gap-1 shrink-0">
          <UButton
            icon="i-lucide-copy"
            color="neutral"
            variant="ghost"
            size="xs"
            @click="copyText(from)"
          />
          <UButton
            :to="addressExplorerUrl(from)"
            target="_blank"
            icon="i-lucide-external-link"
            color="neutral"
            variant="ghost"
            size="xs"
          />
        </div>
      </div>

      <div class="flex items-center gap-3 py-1">
        <span class="shrink-0 w-12" />
        <div class="flex items-center gap-2">
          <div class="w-px h-5 bg-border" />
          <UIcon name="i-lucide-arrow-down" class="size-4 text-dimmed" />
          <div class="w-px h-5 bg-border" />
        </div>
      </div>

      <div class="flex items-center gap-3 py-2">
        <span class="text-xs text-dimmed shrink-0 w-12 text-right">接收方</span>
        <span class="font-mono text-sm break-all">{{ to }}</span>
        <div class="flex items-center gap-1 shrink-0">
          <UButton
            icon="i-lucide-copy"
            color="neutral"
            variant="ghost"
            size="xs"
            @click="copyText(to)"
          />
          <UButton
            :to="addressExplorerUrl(to)"
            target="_blank"
            icon="i-lucide-external-link"
            color="neutral"
            variant="ghost"
            size="xs"
          />
        </div>
      </div>
    </div>
  </UPageCard>
</template>
