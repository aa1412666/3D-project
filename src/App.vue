<script setup lang="ts">
import ModelViewer from './components/ModelViewer.vue'
</script>

<template>
  <main class="container">
    <h1>3D 模型展示</h1>
    <ModelViewer src="/models/UtensilsJar001.glb" />
    <p class="desc">
      将 <code>UtensilsJar001.glb</code> 放到 <code>public/models/</code> 目录后即可显示。
    </p>
  </main>
</template>

<style scoped>
.container {
  padding: 1rem;
}
.desc {
  color: #555;
}
</style>
