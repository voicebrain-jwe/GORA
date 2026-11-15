<template>
  <ion-refresher slot="fixed" @ionRefresh="refresh">
    <ion-refresher-content />
  </ion-refresher>
</template>

<script setup lang="ts">
import { IonRefresher, IonRefresherContent } from '@ionic/vue';

const props = defineProps<{ reload: () => Promise<unknown> }>();
async function refresh(event: CustomEvent): Promise<void> {
  try {
    await props.reload();
  } finally {
    await (event.target as HTMLIonRefresherElement).complete();
  }
}
</script>
