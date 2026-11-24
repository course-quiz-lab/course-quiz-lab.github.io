<script setup lang="ts">
const year = new Date().getFullYear();
</script>

<template>
  <footer class="border-t border-default">
    <UContainer
      class="flex flex-col items-center justify-between gap-1.5 py-3 text-xs text-muted sm:flex-row sm:py-4"
    >
      <p class="m-0">&copy; {{ year }} 刷题小站</p>
      <ULink
        to="https://github.com/course-quiz-lab/course-quiz-lab.github.io"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center gap-1 text-muted transition-colors hover:text-primary"
      >
        <UIcon name="i-lucide-github" class="size-3.5" />
        <span>GitHub</span>
      </ULink>
    </UContainer>
  </footer>
</template>
