<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";

const props = defineProps<{
  walletId: string;
  balances: { trx: string; usdt: string };
  network: "mainnet" | "nile";
}>();

const open = defineModel<boolean>({ default: false });
const toast = useToast();
const { isOnline: mpcOnline } = useMpcHealth();

const tabs = [
  { label: "TRX", value: "TRX" },
  { label: "USDT", value: "USDT" },
];

const schema = z.object({
  to: z.string().min(1, "请输入目标地址"),
  amount: z.string().min(1, "请输入金额"),
  token: z.enum(["TRX", "USDT"]),
});

const state = reactive({
  to: "",
  amount: "",
  token: "TRX" as "TRX" | "USDT",
});

const submitting = ref(false);
const pasting = ref(false);

const selectedBalance = computed(() => {
  if (state.token === "TRX") return props.balances.trx;
  return props.balances.usdt;
});

function setMax() {
  if (state.token === "TRX") {
    const balance = Number(props.balances.trx || "0");
    const reserve = 1;
    state.amount = String(Math.max(0, balance - reserve));
  } else {
    state.amount = props.balances.usdt || "0";
  }
}

async function pasteAddress() {
  pasting.value = true;
  try {
    const text = await navigator.clipboard.readText();
    if (text) state.to = text.trim();
  } catch {
    toast.add({ title: "剪贴板读取失败", color: "error" });
  } finally {
    pasting.value = false;
  }
}

function reset() {
  state.to = "";
  state.amount = "";
  state.token = "TRX";
}

watch(open, (newVal) => {
  if (!newVal) {
    reset();
    submitting.value = false;
  }
});

function handleTransferError(e: any) {
  const statusCode = e.statusCode ?? e.status;
  const description = e.data?.message ?? e.statusMessage ?? e.message ?? "转账失败";
  const title = statusCode === 400 ? "转账参数错误" : "转账失败";
  toast.add({ title, description, color: "error" });
}

async function onSubmit(event: FormSubmitEvent<typeof state>) {
  submitting.value = true;
  try {
    const result: { success: boolean; txId: string; status: string } = await $fetch(
      `/api/wallets/${props.walletId}/transfer`,
      {
        method: "POST",
        body: {
          to: event.data.to,
          amount: event.data.amount,
          token: event.data.token,
          network: props.network,
        },
      },
    );
    open.value = false;
    navigateTo(`/wallets/${props.walletId}/transactions/${result.txId}`);
  } catch (e: any) {
    handleTransferError(e);
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <UModal v-model:open="open" title="转账">
    <template #body>
      <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
        <UTabs
          v-model="state.token"
          :items="tabs"
          class="w-full"
          :ui="{ list: 'justify-center' }"
        />

        <div class="text-center text-sm">
          <span class="text-dimmed">可用余额</span>
          <span class="font-semibold ml-1">
            {{ formatAmount(selectedBalance) }} {{ state.token }}
          </span>
        </div>

        <UFormField name="to" class="w-full">
          <UInput v-model="state.to" placeholder="接收地址" class="font-mono w-full">
            <template #trailing>
              <UButton
                icon="i-lucide-clipboard-paste"
                color="neutral"
                variant="ghost"
                size="xs"
                :loading="pasting"
                @click="pasteAddress"
              />
            </template>
          </UInput>
        </UFormField>

        <UFormField name="amount">
          <div class="flex gap-2">
            <UInput v-model="state.amount" placeholder="0.00" class="font-mono flex-1" />
            <UButton label="最大" color="neutral" variant="outline" size="sm" @click="setMax" />
          </div>
        </UFormField>

        <div
          v-if="state.token === 'USDT'"
          class="flex items-center justify-center gap-1 text-xs text-warning"
        >
          <UIcon name="i-lucide-info" class="size-3" />
          USDT 转账需要 TRX 作为手续费
        </div>

        <UButton
          label="确认转账"
          color="primary"
          type="submit"
          :loading="submitting"
          :disabled="!mpcOnline"
          block
        />
        <p v-if="!mpcOnline" class="text-center text-sm text-warning">MPC 服务离线，无法发起转账</p>
      </UForm>
    </template>
  </UModal>
</template>
