<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";

const route = useRoute();
const toast = useToast();

const open = ref(false);

const links = [
  {
    label: "首页",
    icon: "i-lucide-house",
    to: "/",
    onSelect: () => {
      open.value = false;
    },
  },
  {
    label: "钱包",
    icon: "i-lucide-wallet",
    to: "/wallets",
    onSelect: () => {
      open.value = false;
    },
  },
] satisfies NavigationMenuItem[];

const groups = computed(() => [
  {
    id: "links",
    label: "前往",
    items: links,
  },
]);

onMounted(async () => {
  const cookie = useCookie("cookie-consent");
  if (cookie.value === "accepted") {
    return;
  }

  toast.add({
    title: "我们使用第一方 Cookie 来提升您在我们网站上的体验。",
    duration: 0,
    close: false,
    actions: [
      {
        label: "接受",
        color: "neutral",
        variant: "outline",
        onClick: () => {
          cookie.value = "accepted";
        },
      },
      {
        label: "退出",
        color: "neutral",
        variant: "ghost",
      },
    ],
  });
});
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar
      id="default"
      v-model:open="open"
      collapsible
      resizable
      class="bg-elevated/25"
      :ui="{ footer: 'lg:border-t lg:border-default' }"
    >
      <template #header="{ collapsed }">
        <NetworkSwitcher :collapsed="collapsed" />
      </template>

      <template #default="{ collapsed }">
        <UDashboardSearchButton :collapsed="collapsed" class="bg-transparent ring-default" />

        <UNavigationMenu
          :collapsed="collapsed"
          :items="links"
          orientation="vertical"
          tooltip
          popover
        />

        <SidebarMpcStatus :collapsed="collapsed" class="mt-auto" />
      </template>

      <template #footer="{ collapsed }">
        <UserMenu :collapsed="collapsed" />
      </template>
    </UDashboardSidebar>

    <UDashboardSearch :groups="groups" />

    <slot />
  </UDashboardGroup>
</template>
