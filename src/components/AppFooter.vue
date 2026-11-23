<script setup lang="ts">
const year = new Date().getFullYear();
</script>

<template>
  <footer class="border-t border-default">
    <UContainer
      class="flex flex-col items-center justify-between gap-3 py-8 text-sm text-muted sm:flex-row"
    >
      <p class="m-0">&copy; {{ year }} 刷题小站</p>
      <ULink
        to="https://github.com/course-quiz-lab/course-quiz-lab.github.io"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center gap-1.5 text-muted transition-colors hover:text-primary"
      >
        <UIcon name="i-lucide-github" class="size-4" />
        <span>GitHub</span>
      </ULink>
    </UContainer>
  </footer>
</template>
