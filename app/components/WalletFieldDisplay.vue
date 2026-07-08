<script setup lang="ts">
defineProps<{
  label: string;
  value: string;
  monospace?: boolean;
  copyLabel?: string;
  textClass?: string;
}>();

const toast = useToast();

function handleCopy(text: string, label: string) {
  navigator.clipboard.writeText(text);
  toast.add({ title: label, color: "success" });
}
</script>

<template>
  <div>
    <div class="text-sm text-muted mb-1">{{ label }}</div>
    <div
      class="bg-elevated/50 p-2 rounded-lg flex items-center justify-between gap-2"
      :class="[monospace ? 'font-mono text-sm' : '', textClass || '']"
    >
      <span class="break-all">{{ value }}</span>
      <UButton
        icon="i-lucide-copy"
        color="neutral"
        variant="ghost"
        size="xs"
        class="shrink-0"
        @click="handleCopy(value, copyLabel || `${label} 已复制`)"
      />
    </div>
  </div>
</template>
