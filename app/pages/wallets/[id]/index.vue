<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";

const route = useRoute();
const { network } = useTronNetwork();
const { formatDateTime } = useTimeSettings();
const toast = useToast();

function handleCopy(text: string, label: string) {
  navigator.clipboard.writeText(text);
  toast.add({ title: label, color: "success" });
}

const id = route.params.id as string;

const transferOpen = ref(false);

const txTab = ref("all");

const {
  data: wallet,
  status,
  refresh,
} = await useFetch(`/api/wallets/${id}`, {
  query: { network },
  lazy: true,
});

watch(network, () => {
  refresh();
  refreshTx();
});

const {
  data: transactions,
  refresh: refreshTx,
  status: txStatus,
} = await useFetch(`/api/wallets/${id}/transactions`, {
  query: { network },
  lazy: true,
});

const txColumns: TableColumn<any>[] = [
  { accessorKey: "network", header: "网络", cell: ({ row }) => row.original.network || "-" },
  { accessorKey: "token", header: "代币", cell: ({ row }) => row.original.token },
  { accessorKey: "type", header: "类型", cell: ({ row }) => row.original.type },
  {
    accessorKey: "to",
    header: "目标",
    cell: ({ row }) =>
      row.original.to
        ? h("div", { class: "flex items-center gap-1" }, [
            h(resolveComponent("UTooltip"), { text: row.original.to }, () =>
              h("span", { class: "font-mono text-sm" }, truncateMiddle(row.original.to)),
            ),
            h(resolveComponent("UButton"), {
              icon: "i-lucide-copy",
              color: "neutral",
              variant: "ghost",
              size: "xs",
              onClick: () => handleCopy(row.original.to, "地址 已复制"),
            }),
          ])
        : "-",
  },
  {
    accessorKey: "amount",
    header: "金额",
    cell: ({ row }) => formatAmount(row.original.amount),
  },
  {
    accessorKey: "status",
    header: "状态",
    cell: ({ row }) => {
      const { text, color } = getTransactionStatusDisplay(row.original.status);
      return h("span", { class: `text-${color}` }, text);
    },
  },
  {
    accessorKey: "createdAt",
    header: "时间",
    cell: ({ row }) => formatDateTime(row.original.createdAt),
  },
  {
    accessorKey: "txId",
    header: "TxID",
    cell: ({ row }) => {
      if (!row.original.txId) return "-";
      return h("div", { class: "flex items-center gap-1" }, [
        h(resolveComponent("UTooltip"), { text: row.original.txId }, () =>
          h(
            resolveComponent("NuxtLink"),
            { to: `/wallets/${id}/transactions/${row.original.txId}` },
            () =>
              h(
                "span",
                { class: "font-mono text-primary text-sm" },
                truncateMiddle(row.original.txId),
              ),
          ),
        ),
        h(resolveComponent("UButton"), {
          icon: "i-lucide-copy",
          color: "neutral",
          variant: "ghost",
          size: "xs",
          onClick: () => handleCopy(row.original.txId, "TxID 已复制"),
        }),
      ]);
    },
  },
];

const filteredTx = computed(() => {
  if (txTab.value === "all") return transactions.value;
  return transactions.value?.filter((tx: any) => tx.token === txTab.value);
});

const b = computed(() => wallet.value?.resources?.bandwidth);
const e = computed(() => wallet.value?.resources?.energy);

const totalBandwidth = computed(() => (b.value?.freeNetLimit ?? 0) + (b.value?.netLimit ?? 0));
const usedBandwidth = computed(() => (b.value?.freeNetUsed ?? 0) + (b.value?.netUsed ?? 0));
const totalEnergy = computed(() => e.value?.energyLimit ?? 0);
const usedEnergy = computed(() => e.value?.energyUsed ?? 0);
</script>

<template>
  <UDashboardPanel id="wallet-detail">
    <template #header>
      <UDashboardNavbar :title="wallet?.remark || '钱包详情'">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            label="转账"
            color="primary"
            icon="i-lucide-send"
            size="sm"
            @click="
              () => {
                transferOpen = true;
              }
            "
          />
          <UButton
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            @click="
              () => {
                navigateTo('/wallets');
              }
            "
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <Spinner v-if="status === 'pending'" text="加载中..." />

      <template v-else-if="wallet">
        <div class="mb-6 space-y-4">
          <WalletFieldDisplay
            label="Tron 地址"
            :value="wallet.tronAddress"
            monospace
            copy-label="地址 已复制"
          />
          <WalletFieldDisplay
            label="ECDSA 公钥 (secp256k1)"
            :value="wallet.ecdsaPubKey"
            monospace
            copy-label="公钥 已复制"
            text-class="text-xs text-muted"
          />
        </div>

        <UPageGrid class="lg:grid-cols-4 gap-4 mb-6">
          <ResourceCard icon="i-lucide-coins" title="TRX">
            {{ formatAmount(wallet.balances?.trx) }}
          </ResourceCard>

          <ResourceCard icon="i-lucide-circle-dollar-sign" title="USDT">
            {{ formatAmount(wallet.balances?.usdt) }}
          </ResourceCard>

          <ResourceCard icon="i-lucide-wifi" title="带宽">
            {{ usedBandwidth }} / {{ totalBandwidth }}
          </ResourceCard>

          <ResourceCard icon="i-lucide-zap" title="能量">
            {{ usedEnergy }} / {{ totalEnergy }}
          </ResourceCard>
        </UPageGrid>

        <TransferModal
          v-model:open="transferOpen"
          :wallet-id="id"
          :network="network"
          :balances="{
            trx: wallet.balances?.trx || '0',
            usdt: wallet.balances?.usdt || '0',
          }"
        />

        <UPageCard title="交易历史" variant="subtle">
          <UTabs
            v-model="txTab"
            :items="[
              { label: '全部', value: 'all' },
              { label: 'TRX', value: 'TRX' },
              { label: 'USDT', value: 'USDT' },
            ]"
            class="mb-4"
          />
          <UTable
            v-if="filteredTx?.length || txStatus === 'pending'"
            :data="filteredTx"
            :columns="txColumns"
            :loading="txStatus === 'pending'"
            :ui="{
              base: 'table-fixed border-separate border-spacing-0',
              thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
              tbody: '[&>tr]:last:[&>td]:border-b-0',
              th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
              td: 'border-b border-default text-sm',
              separator: 'h-0',
            }"
          />
          <div v-else class="text-center py-8 text-muted text-sm">暂无交易记录</div>
        </UPageCard>
      </template>

      <div v-else class="text-center py-12 text-muted">钱包不存在</div>
    </template>
  </UDashboardPanel>
</template>
