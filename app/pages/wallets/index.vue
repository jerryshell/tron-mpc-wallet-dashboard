<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";

const toast = useToast();
const { network } = useTronNetwork();
const { formatDateTime } = useTimeSettings();

function copyAddress(address: string) {
  navigator.clipboard.writeText(address);
  toast.add({ title: "地址 已复制", color: "success" });
}

const {
  data: wallets,
  status,
  refresh,
} = await useFetch("/api/wallets", {
  query: { network },
  lazy: true,
});

watch(network, () => {
  refresh();
});

const columns: TableColumn<any>[] = [
  {
    accessorKey: "remark",
    header: "备注",
    cell: ({ row }) => row.original.remark || "-",
  },
  {
    accessorKey: "createdAt",
    header: "创建时间",
    cell: ({ row }) => formatDateTime(row.original.createdAt),
  },
  {
    accessorKey: "tronAddress",
    header: "地址",
    cell: ({ row }) => {
      const UTooltip = resolveComponent("UTooltip");
      const UButton = resolveComponent("UButton");
      return h("div", { class: "flex items-center gap-1" }, [
        h(UTooltip, { text: row.original.tronAddress }, () =>
          h(
            "span",
            { class: "font-mono text-sm text-muted" },
            truncateMiddle(row.original.tronAddress),
          ),
        ),
        h(UButton, {
          icon: "i-lucide-copy",
          color: "neutral",
          variant: "ghost",
          size: "xs",
          onClick: () => copyAddress(row.original.tronAddress),
        }),
      ]);
    },
  },
  {
    accessorKey: "balances.trx",
    header: "TRX",
    cell: ({ row }) => formatAmount(row.original.balances?.trx),
  },
  {
    accessorKey: "balances.usdt",
    header: "USDT",
    cell: ({ row }) => formatAmount(row.original.balances?.usdt),
    id: "usdt",
  },
  {
    id: "actions",
    header: "操作",
    cell: ({ row }) => {
      const NuxtLink = resolveComponent("NuxtLink");
      return h("div", { class: "flex items-center gap-1" }, [
        h(NuxtLink, { to: `/wallets/${row.original.id}` }, () =>
          h(resolveComponent("UButton"), {
            label: "详情",
            color: "neutral",
            variant: "ghost",
            size: "sm",
          }),
        ),
        h(resolveComponent("UButton"), {
          label: "编辑",
          color: "neutral",
          variant: "ghost",
          size: "sm",
          onClick: () => openEdit(row.original),
        }),
      ]);
    },
  },
];

const createOpen = ref(false);
const creating = ref(false);

async function onCreateWallet(event: { remark?: string }) {
  creating.value = true;
  try {
    await $fetch("/api/wallets", {
      method: "POST",
      body: { remark: event.remark || "" },
    });
    createOpen.value = false;
    await refresh();
    toast.add({ title: "钱包创建成功", color: "success" });
  } catch (e: any) {
    toast.add({ title: "创建失败", description: e.message, color: "error" });
  } finally {
    creating.value = false;
  }
}

const editOpen = ref(false);
const editingWalletId = ref("");
const editingRemark = ref("");
const editing = ref(false);

// 地址检查相关
const verifyOpen = ref(false);
const verifying = ref(false);
const verifyResult = ref<any>(null);

function openEdit(wallet: any) {
  editingWalletId.value = wallet.id;
  editingRemark.value = wallet.remark || "";
  editOpen.value = true;
}

async function onUpdateWallet(event: { remark?: string }) {
  editing.value = true;
  try {
    await $fetch(`/api/wallets/${editingWalletId.value}`, {
      method: "PATCH",
      body: { remark: event.remark },
    });
    editOpen.value = false;
    await refresh();
    toast.add({ title: "备注更新成功", color: "success" });
  } catch (e: any) {
    toast.add({ title: "更新失败", description: e.message, color: "error" });
  } finally {
    editing.value = false;
  }
}

async function onVerifyAddresses() {
  verifying.value = true;
  verifyResult.value = null;
  verifyOpen.value = true;
  try {
    const result = await $fetch("/api/wallets/verify-addresses", {
      method: "POST",
    });
    verifyResult.value = result;
    if (result.fixedCount > 0) {
      await refresh();
    }
  } catch (e: any) {
    toast.add({ title: "验证失败", description: e.message, color: "error" });
    verifyOpen.value = false;
  } finally {
    verifying.value = false;
  }
}
</script>

<template>
  <UDashboardPanel id="wallets">
    <template #header>
      <UDashboardNavbar title="钱包">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <div class="flex items-center gap-2">
            <UButton
              label="检查地址"
              icon="i-lucide-shield-check"
              color="warning"
              :loading="verifying"
              @click="onVerifyAddresses"
            />

            <UButton
              label="创建钱包"
              icon="i-lucide-plus"
              @click="
                () => {
                  createOpen = true;
                }
              "
            />

            <WalletFormModal
              v-model:open="createOpen"
              title="创建钱包"
              submit-label="创建"
              :loading="creating"
              show-mpc-warning
              @submit="onCreateWallet"
            />

            <WalletFormModal
              v-model:open="editOpen"
              title="编辑备注"
              :initial-remark="editingRemark"
              submit-label="保存"
              :loading="editing"
              @submit="onUpdateWallet"
            />

            <!-- 地址检查结果弹窗 -->
            <UModal v-model:open="verifyOpen" title="地址检查结果" :ui="{ width: 'max-w-2xl' }">
              <template #body>
                <div v-if="verifying" class="flex items-center justify-center py-8">
                  <Spinner text="正在检查所有钱包地址..." />
                </div>
                <div v-else-if="verifyResult" class="space-y-4">
                  <div class="grid grid-cols-3 gap-3">
                    <div class="bg-elevated rounded-lg p-3 text-center">
                      <div class="text-2xl font-bold text-primary">{{ verifyResult.total }}</div>
                      <div class="text-xs text-muted">总钱包数</div>
                    </div>
                    <div class="bg-elevated rounded-lg p-3 text-center">
                      <div class="text-2xl font-bold text-success">
                        {{ verifyResult.validCount }}
                      </div>
                      <div class="text-xs text-muted">地址正确</div>
                    </div>
                    <div class="bg-elevated rounded-lg p-3 text-center">
                      <div
                        class="text-2xl font-bold"
                        :class="verifyResult.fixedCount > 0 ? 'text-warning' : 'text-success'"
                      >
                        {{ verifyResult.fixedCount }}
                      </div>
                      <div class="text-xs text-muted">已修复</div>
                    </div>
                  </div>

                  <div
                    v-if="verifyResult.fixedCount > 0"
                    class="bg-warning/10 border border-warning/20 rounded-lg p-3"
                  >
                    <div class="flex items-center gap-2 text-warning">
                      <UIcon name="i-lucide-alert-triangle" class="size-4" />
                      <span class="text-sm font-medium"
                        >发现并修复了 {{ verifyResult.fixedCount }} 个地址不匹配的钱包</span
                      >
                    </div>
                  </div>

                  <div class="max-h-64 overflow-y-auto">
                    <table class="w-full text-sm">
                      <thead>
                        <tr class="border-b border-default">
                          <th class="text-left py-2 px-2 text-muted font-medium">备注</th>
                          <th class="text-left py-2 px-2 text-muted font-medium">状态</th>
                          <th class="text-left py-2 px-2 text-muted font-medium">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr
                          v-for="item in verifyResult.results"
                          :key="item.id"
                          class="border-b border-default"
                        >
                          <td class="py-2 px-2">{{ item.remark }}</td>
                          <td class="py-2 px-2">
                            <UBadge v-if="item.isValid" color="success" variant="subtle" size="sm"
                              >正确</UBadge
                            >
                            <UBadge
                              v-else-if="item.fixed"
                              color="warning"
                              variant="subtle"
                              size="sm"
                              >已修复</UBadge
                            >
                            <UBadge v-else color="error" variant="subtle" size="sm">无公钥</UBadge>
                          </td>
                          <td class="py-2 px-2">
                            <NuxtLink :to="`/wallets/${item.id}`">
                              <UButton label="查看" color="neutral" variant="ghost" size="xs" />
                            </NuxtLink>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div class="flex justify-end pt-2">
                    <UButton label="关闭" color="neutral" @click="verifyOpen = false" />
                  </div>
                </div>
              </template>
            </UModal>
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <UTable
        v-if="wallets?.length"
        :data="wallets"
        :columns="columns"
        :loading="status === 'pending'"
        :ui="{
          base: 'table-fixed border-separate border-spacing-0',
          thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
          tbody: '[&>tr]:last:[&>td]:border-b-0',
          th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
          td: 'border-b border-default',
          separator: 'h-0',
        }"
      />

      <Spinner v-else-if="status === 'pending'" text="加载中..." />

      <div v-else class="text-center py-12 text-muted">
        <UIcon name="i-lucide-wallet" class="size-8 mb-2 opacity-50" />
        <p>暂无钱包，点击上方按钮创建一个</p>
      </div>
    </template>
  </UDashboardPanel>
</template>
