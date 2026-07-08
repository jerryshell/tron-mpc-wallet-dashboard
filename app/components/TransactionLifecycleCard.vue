<script setup lang="ts">
const props = defineProps<{
  status: "success" | "failed" | "pending" | string;
  createdAt: number;
  blockTimestamp?: number;
}>();

const { formatDateTime } = useTimeSettings();

const isFailed = computed(() => props.status === "failed");
const isSuccess = computed(() => props.status === "success");
const isPending = computed(() => props.status === "pending");

const hasConfirmation = computed(() => props.blockTimestamp != null && props.blockTimestamp > 0);

const steps = computed(() => {
  if (isFailed.value) {
    return [
      { label: "已广播", time: formatDateTime(props.createdAt), state: "done" as const },
      { label: "执行失败", time: undefined, state: "failed" as const },
    ];
  }

  return [
    { label: "已广播", time: formatDateTime(props.createdAt), state: "done" as const },
    {
      label: "已确认",
      time: hasConfirmation.value ? formatDateTime(props.blockTimestamp) : undefined,
      state: hasConfirmation.value ? ("done" as const) : ("pending" as const),
    },
    {
      label: "已完成",
      time:
        isSuccess.value && hasConfirmation.value ? formatDateTime(props.blockTimestamp) : undefined,
      state: isSuccess.value ? ("done" as const) : ("pending" as const),
    },
  ];
});

function stepIcon(state: "done" | "pending" | "failed") {
  if (state === "done") return "i-lucide-check-circle";
  if (state === "failed") return "i-lucide-x-circle";
  return "i-lucide-circle-dashed";
}

function stepColor(state: "done" | "pending" | "failed") {
  if (state === "done") return "text-success";
  if (state === "failed") return "text-error";
  return "text-dimmed";
}
</script>

<template>
  <UPageCard title="交易状态" variant="subtle" class="mb-4">
    <div class="flex items-start justify-between gap-2">
      <div
        v-for="(step, index) in steps"
        :key="step.label"
        class="flex-1 flex flex-col items-center text-center gap-2"
      >
        <UIcon :name="stepIcon(step.state)" class="size-6" :class="stepColor(step.state)" />
        <div class="space-y-0.5">
          <div class="text-sm font-medium">{{ step.label }}</div>
          <div v-if="step.time" class="text-xs text-dimmed">{{ step.time }}</div>
        </div>
      </div>
    </div>

    <div v-if="isPending" class="mt-4 text-sm text-muted text-center">
      交易已广播，正在等待链上确认...
    </div>
  </UPageCard>
</template>
