<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";

const props = defineProps<{
  open: boolean;
  title: string;
  initialRemark?: string;
  submitLabel: string;
  loading: boolean;
  showMpcWarning?: boolean;
}>();

const emit = defineEmits<{
  (e: "update:open", value: boolean): void;
  (e: "submit", data: { remark?: string }): void;
}>();

const mpcOnline = props.showMpcWarning ? useMpcHealth().isOnline : ref(true);

const schema = z.object({
  remark: z.string().optional(),
});

const state = reactive({ remark: props.initialRemark || "" });

watch(
  () => props.initialRemark,
  (val) => {
    state.remark = val || "";
  },
);

function onSubmit(event: FormSubmitEvent<{ remark?: string }>) {
  emit("submit", event.data);
}
</script>

<template>
  <UModal :open="open" :title="title" @update:open="emit('update:open', $event)">
    <template #body>
      <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
        <UFormField label="备注" name="remark">
          <UInput v-model="state.remark" placeholder="选填" class="w-full" />
        </UFormField>
        <div class="flex justify-end gap-2">
          <UButton
            label="取消"
            color="neutral"
            variant="subtle"
            @click="emit('update:open', false)"
          />
          <UButton
            :label="submitLabel"
            color="primary"
            variant="solid"
            type="submit"
            :loading="loading"
            :disabled="showMpcWarning && !mpcOnline"
          />
        </div>
        <p v-if="showMpcWarning && !mpcOnline" class="text-center text-sm text-warning">
          MPC 服务离线，无法创建钱包
        </p>
      </UForm>
    </template>
  </UModal>
</template>
