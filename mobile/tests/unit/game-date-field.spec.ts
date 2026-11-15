import { mount, type VueWrapper } from '@vue/test-utils';
import { afterEach, expect, test, vi } from 'vitest';
import GameDateField from '@/components/games/GameDateField.vue';

vi.mock('@ionic/vue', () => ({
  IonIcon: { template: '<span />' },
  IonModal: { props: ['isOpen'], template: '<section v-if="isOpen"><slot /></section>' },
  IonDatetime: { name: 'IonDatetime', props: ['value', 'presentation', 'min', 'max', 'showDefaultButtons', 'showClearButton'], template: '<div />' },
}));
let wrapper: VueWrapper | undefined;
afterEach(() => wrapper?.unmount());

test('opens the calendar from the field or keyboard and confirms an in-range date', async () => {
  wrapper = mount(GameDateField, { props: { id: 'date', modelValue: '', min: '2026-11-15', max: '2027-11-15' } });
  await wrapper.get('input').trigger('keydown', { key: 'Enter' });
  expect(wrapper.get('input').attributes('aria-expanded')).toBe('true');
  const calendar = wrapper.getComponent({ name: 'IonDatetime' });
  expect(calendar.props('showDefaultButtons')).toBe(true);
  calendar.vm.$emit('ionChange', { detail: { value: '2026-11-19T00:00:00+08:00' } });
  expect(wrapper.emitted('update:modelValue')).toEqual([['2026-11-19']]);
});

test('start/end time picker preserves local wall-clock time without UTC conversion', async () => {
  wrapper = mount(GameDateField, { props: { id: 'start', modelValue: '09:00', presentation: 'time', label: 'Choose start time' } });
  await wrapper.get('[aria-label="Choose start time"]').trigger('click');
  const picker = wrapper.getComponent({ name: 'IonDatetime' });
  expect(picker.props('presentation')).toBe('time');
  expect(picker.props('value')).toBe('2000-01-01T09:00');
  picker.vm.$emit('ionChange', { detail: { value: '2000-01-01T18:35:00+08:00' } });
  expect(wrapper.emitted('update:modelValue')).toEqual([['18:35']]);
});

test('cancels without changing the form and reopens with the saved value', async () => {
  wrapper = mount(GameDateField, { props: { id: 'end', modelValue: '20:00', presentation: 'time' } });
  await wrapper.get('input').trigger('click');
  wrapper.getComponent({ name: 'IonDatetime' }).vm.$emit('ionCancel');
  await wrapper.vm.$nextTick();
  expect(wrapper.emitted('update:modelValue')).toBeUndefined();
  await wrapper.get('button').trigger('click');
  expect(wrapper.getComponent({ name: 'IonDatetime' }).props('value')).toBe('2000-01-01T20:00');
});

test('respects date bounds and can clear an optional registration deadline', async () => {
  wrapper = mount(GameDateField, { props: { id: 'registration', modelValue: '', presentation: 'date-time', min: '2026-11-15', max: '2026-11-19T18:00', allowClear: true } });
  await wrapper.get('button').trigger('click');
  const picker = wrapper.getComponent({ name: 'IonDatetime' });
  picker.vm.$emit('ionChange', { detail: { value: '2026-11-20T18:00' } });
  expect(wrapper.emitted('update:modelValue')).toBeUndefined();
  picker.vm.$emit('ionChange', { detail: { value: '2026-11-19T17:30:00+08:00' } });
  expect(wrapper.emitted('update:modelValue')).toEqual([['2026-11-19T17:30']]);
  await wrapper.vm.$nextTick();
  await wrapper.get('button').trigger('click');
  wrapper.getComponent({ name: 'IonDatetime' }).vm.$emit('ionChange', { detail: { value: null } });
  expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['']);
});
