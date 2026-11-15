<template>
  <div class="game-date-field">
    <input
      :id="id"
      :value="displayValue"
      :type="inputType"
      :placeholder="presentation === 'time' ? 'Choose time (AM/PM)' : 'Choose date and time'"
      :min="min"
      :max="max"
      class="game-date-field__input"
      readonly
      aria-haspopup="dialog"
      :aria-expanded="open"
      @click.prevent="open = true"
      @keydown.enter.prevent="open = true"
      @keydown.space.prevent="open = true"
    />
    <button type="button" class="game-date-field__open" :aria-label="pickerLabel" aria-haspopup="dialog" @click="open = true">
      <ion-icon :icon="presentation === 'time' ? timeOutline : calendarOutline" aria-hidden="true" />
    </button>
    <ion-modal :is-open="open" class="game-date-modal" :class="{ 'game-date-modal--time': presentation === 'time' }" @did-dismiss="open = false">
      <div class="game-date-field__calendar">
        <h2>{{ pickerLabel }}</h2>
        <ion-datetime
          v-if="open"
          :presentation="presentation"
          :value="pickerValue"
          :min="min"
          :max="max"
          :show-default-buttons="true"
          :show-clear-button="allowClear"
          :prefer-wheel="presentation === 'time'"
          hour-cycle="h12"
          locale="en-US"
          :done-text="presentation === 'time' ? 'Use time' : 'Use date'"
          cancel-text="Cancel"
          @ion-change="chooseDate"
          @ion-cancel="open = false"
        />
      </div>
    </ion-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { IonDatetime, IonIcon, IonModal } from '@ionic/vue';
import { calendarOutline, timeOutline } from 'ionicons/icons';

const props = withDefaults(defineProps<{
  id: string;
  modelValue: string;
  min?: string;
  max?: string;
  presentation?: 'date' | 'time' | 'date-time';
  label?: string;
  allowClear?: boolean;
}>(), { presentation: 'date', allowClear: false });
const emit = defineEmits<{ 'update:modelValue': [date: string] }>();
const open = ref(false);
// A native time input follows the browser's locale and can still render 24-hour
// text. Format the readonly display ourselves; the picker and API keep ISO values.
const inputType = computed(() => props.presentation === 'date' ? 'date' : 'text');
const displayValue = computed(() => {
  if (!props.modelValue || props.presentation === 'date') return props.modelValue;
  const time = props.presentation === 'time' ? props.modelValue : props.modelValue.split('T')[1];
  const match = /^(\d{2}):(\d{2})/.exec(time ?? '');
  if (!match) return '';
  const hour = Number(match[1]);
  const clock = `${hour % 12 || 12}:${match[2]} ${hour < 12 ? 'AM' : 'PM'}`;
  if (props.presentation === 'time') return clock;
  const [year, month, day] = props.modelValue.slice(0, 10).split('-');
  return `${month}/${day}/${year}, ${clock}`;
});
const pickerLabel = computed(() => props.label || (props.presentation === 'time' ? 'Choose game time' : 'Choose game date'));
const pickerValue = computed(() => props.presentation === 'time'
  ? `2000-01-01T${props.modelValue || '09:00'}`
  : props.modelValue || props.min);

function chooseDate(event: CustomEvent<{ value?: string | string[] | null }>): void {
  const value = event.detail.value;
  if (value == null && props.allowClear) {
    emit('update:modelValue', '');
    open.value = false;
    return;
  }
  if (typeof value !== 'string') return;
  // Preserve the selected venue wall-clock time; do not convert through UTC.
  const selected = props.presentation === 'time'
    ? (value.includes('T') ? value.split('T')[1] : value).slice(0, 5)
    : value.slice(0, props.presentation === 'date' ? 10 : 16);
  const valid = props.presentation === 'time'
    ? /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(selected)
    : (props.presentation === 'date' ? /^\d{4}-\d{2}-\d{2}$/ : /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d$/).test(selected);
  if (!valid || (props.min && selected < props.min) || (props.max && selected > props.max)) return;
  emit('update:modelValue', selected);
  open.value = false;
}
</script>

<style scoped>
.game-date-field {
  position: relative;
  display: flex;
  min-width: 0;
}
.game-date-field__input {
  width: 100%;
  min-width: 0;
  min-height: 48px;
  padding: 11px 52px 11px 12px;
  border: 1px solid var(--gora-line-strong);
  border-radius: 12px;
  background: var(--gora-surface);
  color: var(--ion-text-color);
  font: inherit;
  color-scheme: inherit;
  cursor: pointer;
}
.game-date-field__input::-webkit-calendar-picker-indicator { display: none; }
.game-date-field__open {
  position: absolute;
  inset: 0 0 0 auto;
  display: grid;
  width: 48px;
  place-items: center;
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: var(--ion-color-primary);
  font-size: 22px;
  cursor: pointer;
}
.game-date-field__calendar {
  height: 100%;
  max-height: calc(100dvh - 32px);
  overflow-y: auto;
  padding: 16px;
  background: var(--gora-surface);
  color: var(--ion-text-color);
}
.game-date-field__calendar h2 { margin: 0 0 12px; font-size: 1.1rem; }
.game-date-field__calendar ion-datetime {
  --background: var(--gora-surface);
  --background-rgb: var(--ion-background-color-rgb);
  --wheel-highlight-background: var(--gora-surface-raised);
  --wheel-fade-background-rgb: var(--ion-background-color-rgb);
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
  color: var(--ion-text-color);
}
.game-date-modal {
  --width: min(390px, calc(100% - 24px));
  --height: min(600px, calc(100dvh - 24px));
  --max-height: calc(100% - 24px);
}
.game-date-modal--time { --height: min(360px, calc(100dvh - 24px)); }
</style>
