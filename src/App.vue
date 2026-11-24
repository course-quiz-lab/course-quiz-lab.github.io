<script setup lang="ts">
import { RouterView } from 'vue-router';
import AppShell from './components/AppShell.vue';
import ConfirmDialog from './components/ConfirmDialog.vue';
</script>

<template>
  <UApp>
    <AppShell>
      <RouterView />
    </AppShell>
    <ConfirmDialog />
  </UApp>
</template>
