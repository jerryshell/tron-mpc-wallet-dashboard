<script setup lang="ts">
defineProps<{
  collapsed?: boolean;
}>();

const { isOnline: online } = useMpcHealth();
</script>

<template>
  <UTooltip v-if="collapsed" text="MPC 服务" :content="{ side: 'right' }">
    <div class="flex items-center px-2 py-1.5">
      <div class="flex items-center justify-center shrink-0 size-5">
        <div class="size-2 rounded-full" :class="online ? 'bg-success' : 'bg-error'" />
      </div>
    </div>
  </UTooltip>
  <div v-else class="flex items-center gap-2 px-2 py-1.5">
    <div class="flex items-center justify-center shrink-0 size-5">
      <div class="size-2 rounded-full" :class="online ? 'bg-success' : 'bg-error'" />
    </div>
    <span class="text-sm text-dimmed truncate">
      {{ online ? "MPC 在线" : "MPC 离线" }}
    </span>
  </div>
</template>
