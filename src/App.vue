<script setup lang="ts">
import ModelViewer from './components/ModelViewer.vue'
</script>

<template>
  <main class="container">
    <h1>3D 模型展示</h1>
    <ModelViewer
      src="/models/UtensilsJar001.glb"
      :envMap="'/env/studio_small_03_2k.hdr'"
      :envMapIntensity="1.2"
      :useEnvAsBackground="true"
      :dirIntensity="0.8"
      :hemiIntensity="0.2"
      :dirPosition="[2, 6, 3]"
      :enableShadows="true"
      :enableGround="true"
    />
    <p class="desc">
      将 <code>UtensilsJar001.glb</code> 放到 <code>public/models/</code> 目录即可显示；
      如需启用环境光照（IBL），请将下载的 HDR 文件（例如 <code>studio_small_03_2k.hdr</code>）放到 <code>public/env/</code>，
      并确保路径与上面的 <code>envMap</code> 一致。
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
