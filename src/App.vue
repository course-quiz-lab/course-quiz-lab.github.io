<script setup lang="ts">
import { RouterView } from 'vue-router';
import AppShell from './components/AppShell.vue';
</script>

<template>
  <UApp>
    <AppShell>
      <RouterView />
    </AppShell>
  </UApp>
</template>
