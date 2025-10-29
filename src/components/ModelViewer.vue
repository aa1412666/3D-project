<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch, type Ref } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'

// 组件对外可配置的属性
// - src: GLB 模型路径，默认从 public/models 目录加载
// - background: 背景，传 null 表示透明（alpha 渲染），也可传色值字符串，例如 '#20232a'
// - hemiSkyColor/hemiGroundColor/hemiIntensity: 半球光颜色与强度
// - dirIntensity/dirPosition: 方向光强度与位置
// - envMap: HDR 环境贴图路径（如 /env/studio.hdr），用于 IBL（基于图像的光照）
// - envMapIntensity: 环境贴图对材质的影响强度（MeshStandardMaterial.envMapIntensity）
// - useEnvAsBackground: 是否用 HDR 作为背景
// - enableShadows: 是否启用阴影
// - enableGround: 是否显示地面
type Props = {
  src?: string
  background?: string | null
  hemiSkyColor?: string
  hemiGroundColor?: string
  hemiIntensity?: number
  dirIntensity?: number
  dirPosition?: [number, number, number]
  envMap?: string | null
  envMapIntensity?: number
  useEnvAsBackground?: boolean
  enableShadows?: boolean
  enableGround?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  src: '/models/UtensilsJar001.glb',
  background: null,
  hemiSkyColor: '#ffffff',
  hemiGroundColor: '#444444',
  hemiIntensity: 1.0,
  dirIntensity: 1.2,
  dirPosition: () => [5, 10, 7] as [number, number, number],
  envMap: null,
  envMapIntensity: 1.0,
  useEnvAsBackground: false,
  enableShadows: true,
  enableGround: true,
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
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.0
  renderer.shadowMap.enabled = !!props.enableShadows
  container.value.appendChild(renderer.domElement)

  // Lights
  // 半球光提供环境光感；方向光作为主光源并开启阴影
  const hemi = new THREE.HemisphereLight(
    new THREE.Color(props.hemiSkyColor),
    new THREE.Color(props.hemiGroundColor),
    props.hemiIntensity
  )
  hemi.position.set(0, 1, 0)
  scene.add(hemi)

  const dirLight = new THREE.DirectionalLight(0xffffff, props.dirIntensity)
  dirLight.position.set(...props.dirPosition)
  dirLight.castShadow = !!props.enableShadows
  scene.add(dirLight)

  // Rim Light（可选补光）：低强度方向光从反方向打亮模型轮廓
  const rimLight = new THREE.DirectionalLight(0xffffff, Math.max(props.dirIntensity * 0.3, 0))
  rimLight.position.set(-props.dirPosition[0], props.dirPosition[1] * 0.8, -props.dirPosition[2])
  rimLight.castShadow = false
  scene.add(rimLight)

  // Controls
  // 轨道控制器：支持拖拽旋转、滚轮缩放、惯性（阻尼）
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true

  // Ground (optional subtle)
  // 一个简易的圆形地面用于接收阴影，增加空间感
  if (props.enableGround) {
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(10, 64),
      new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 1, metalness: 0 })
    )
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -0.001
    ground.receiveShadow = !!props.enableShadows
    scene.add(ground)
  }

  // Environment Map（可选）：加载 HDR 环境贴图用于 IBL
  if (props.envMap) {
    const rgbeLoader = new RGBELoader()
    rgbeLoader.load(
      props.envMap,
      (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping
        scene!.environment = texture
        // 若未设置特定背景颜色，且允许使用环境贴图作为背景
        if (props.useEnvAsBackground && props.background === null) {
          scene!.background = texture
        }
      },
      undefined,
      (err) => {
        console.warn('Failed to load HDR env map:', err)
      }
    )
  }

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
          m.castShadow = !!props.enableShadows
          m.receiveShadow = !!props.enableShadows
          type MaterialWithEnv = THREE.Material & { envMapIntensity?: number; needsUpdate?: boolean }
          const mat = m.material as MaterialWithEnv
          // 统一增强 PBR 材质的环境贴图强度（若使用 HDR 环境光）
          if (typeof mat.envMapIntensity === 'number' && typeof props.envMapIntensity === 'number') {
            mat.envMapIntensity = props.envMapIntensity
            mat.needsUpdate = true
          }
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
