<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";

defineProps<{
  collapsed?: boolean;
}>();

const { network, networkLabel, refreshing, triggerRefresh } = useTronNetwork();

const networks = [
  { label: "Nile 测试网", value: "nile", icon: "i-lucide-flask-conical" },
  { label: "主网", value: "mainnet", icon: "i-lucide-globe" },
] as const;

const items = computed<DropdownMenuItem[][]>(() => [
  networks.map((n) => ({
    ...n,
    onSelect() {
      network.value = n.value;
      triggerRefresh();
    },
  })),
]);
</script>

<template>
  <UDropdownMenu
    :items="items"
    :content="{ align: 'center', collisionPadding: 12 }"
    :ui="{ content: collapsed ? 'w-40' : 'w-(--reka-dropdown-menu-trigger-width)' }"
  >
    <UButton
      v-bind="{
        label: collapsed ? undefined : networkLabel,
        trailingIcon: collapsed ? undefined : 'i-lucide-chevrons-up-down',
      }"
      color="neutral"
      variant="ghost"
      block
      :square="collapsed"
      :loading="refreshing"
      class="data-[state=open]:bg-elevated"
      :class="[!collapsed && 'py-2']"
      :ui="{
        trailingIcon: 'text-dimmed',
      }"
    >
      <template #leading>
        <div
          class="size-2.5 rounded-full"
          :class="network === 'mainnet' ? 'bg-success' : 'bg-warning'"
        />
      </template>
    </UButton>
  </UDropdownMenu>
</template>
