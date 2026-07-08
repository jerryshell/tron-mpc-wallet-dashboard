<script setup lang="ts">
defineProps<{
  text?: string;
}>();
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-2 py-12">
    <UIcon name="i-lucide-loader-2" class="size-8 text-primary animate-spin" />
    <span v-if="text" class="text-sm text-muted">{{ text }}</span>
  </div>
</template>
