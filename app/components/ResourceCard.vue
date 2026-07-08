<script setup lang="ts">
defineProps<{
  icon: string;
  title: string;
  loading?: boolean;
}>();
</script>

<template>
  <UPageCard
    :icon="icon"
    :title="title"
    variant="subtle"
    :ui="{
      container: 'gap-y-1.5',
      wrapper: 'items-start',
      leading: 'p-2.5 rounded-full bg-primary/10 ring ring-inset ring-primary/25 flex-col',
      title: 'font-normal text-muted text-xs uppercase',
    }"
  >
    <template v-if="loading">
      <span class="text-xl font-semibold text-muted animate-pulse">--</span>
    </template>
    <span v-else class="text-xl font-semibold text-highlighted">
      <slot />
    </span>
  </UPageCard>
</template>
