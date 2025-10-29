<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch, type Ref } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

// 组件对外可配置的属性
// - src: GLB 模型路径，默认从 public/models 目录加载
// - background: 背景，传 null 表示透明（alpha 渲染），也可传色值字符串，例如 '#20232a'
type Props = {
  src?: string
  background?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  src: '/models/UtensilsJar001.glb',
  background: null,
})

// 用于挂载 WebGL Canvas 的容器引用
const container: Ref<HTMLDivElement | null> = ref(null)

// Three.js 核心对象的引用，便于在卸载时释放
let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let controls: OrbitControls | null = null
let animId: number | null = null

// 释放 Three.js/动画帧/控件等资源，避免内存泄漏
function cleanup() {
  if (animId != null) cancelAnimationFrame(animId)
  controls?.dispose()
  renderer?.dispose()
  renderer = null
  controls = null
  scene = null
  camera = null
}

// 根据模型的包围盒自动设置相机位置/近远裁剪，并把控制器的目标对准模型中心
// offset 越大，相机离模型越远
function fitCameraToObject(cam: THREE.PerspectiveCamera, obj: THREE.Object3D, offset = 1.25) {
  const box = new THREE.Box3().setFromObject(obj)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())

  const maxDim = Math.max(size.x, size.y, size.z)
  const fov = (cam.fov * Math.PI) / 180
  let cameraZ = Math.abs((maxDim / 2) / Math.tan(fov / 2))
  cameraZ *= offset

  cam.position.set(center.x + cameraZ, center.y + cameraZ * 0.6, center.z + cameraZ)
  cam.near = cameraZ / 100
  cam.far = cameraZ * 100
  cam.updateProjectionMatrix()
  controls?.target.copy(center)
  controls?.update()
}

onMounted(() => {
  if (!container.value) return

  const width = container.value.clientWidth || 800
  const height = container.value.clientHeight || 600

  // Scene
  // 创建场景，并根据 props 决定背景颜色或透明
  scene = new THREE.Scene()
  if (props.background === null) {
    scene.background = null
  } else if (typeof props.background === 'string') {
    scene.background = new THREE.Color(props.background)
  }

  // Camera
  // 透视相机：视场角 45°、宽高比与容器一致、默认近远裁剪面 0.1~1000（后续会在 fitCameraToObject 中调整）
  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)

  // Renderer
  // WebGL 渲染器：开启抗锯齿；当背景为 null 时启用 alpha 以实现透明背景
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: props.background === null })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(width, height)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.shadowMap.enabled = true
  container.value.appendChild(renderer.domElement)

  // Lights
  // 半球光提供环境光感；方向光作为主光源并开启阴影
  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0)
  hemi.position.set(0, 1, 0)
  scene.add(hemi)

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.2)
  dirLight.position.set(5, 10, 7)
  dirLight.castShadow = true
  scene.add(dirLight)

  // Controls
  // 轨道控制器：支持拖拽旋转、滚轮缩放、惯性（阻尼）
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true

  // Ground (optional subtle)
  // 一个简易的圆形地面用于接收阴影，增加空间感
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(10, 64),
    new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 1, metalness: 0 })
  )
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -0.001
  ground.receiveShadow = true
  scene.add(ground)

  // Load model
  // 使用 GLTFLoader 异步加载 GLB 模型，加载完成后遍历网格开启阴影并加入场景
  const loader = new GLTFLoader()
  loader.load(
    props.src,
    (gltf) => {
      const root = gltf.scene
      root.traverse((obj: THREE.Object3D) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh
          m.castShadow = true
          m.receiveShadow = true
        }
      })
      scene!.add(root)
      // 根据模型尺寸自动把相机移动到合适位置并对准模型
      fitCameraToObject(camera!, root)
    },
    undefined,
    (err) => {
      console.error('Failed to load GLB:', err)
    }
  )

  // Animate
  // 动画循环：更新控制器并渲染场景
  const tick = () => {
    controls?.update()
    renderer?.render(scene!, camera!)
    animId = requestAnimationFrame(tick)
  }
  tick()

  // Resize
  // 窗口尺寸变化时，更新渲染器与相机的宽高比
  const onResize = () => {
    if (!container.value || !renderer || !camera) return
    const w = container.value.clientWidth
    const h = container.value.clientHeight
    renderer.setSize(w, h)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
  window.addEventListener('resize', onResize)

  onUnmounted(() => {
    // 组件卸载时移除监听并释放资源
    window.removeEventListener('resize', onResize)
    cleanup()
  })
})

watch(
  () => props.src,
  () => {
    // 如果未来需要：可以在这里实现根据 src 变化的模型重新加载逻辑
  }
)
</script>

<template>
  <!-- WebGL 渲染容器，Canvas 会被添加到这个 div 中 -->
  <div ref="container" class="viewer"></div>
  <!-- 简短的交互提示文案 -->
  <div class="hint">拖拽旋转，滚轮缩放</div>
  
</template>

<style scoped>
/* 使 3D 视图占据较高的可视区域 */
.viewer {
  width: 100%;
  height: 70vh;
  display: block;
  position: relative;
}
/* 次要说明文本样式 */
.hint {
  font-size: 12px;
  color: #666;
  margin-top: 8px;
}
</style>
