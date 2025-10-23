<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch, type Ref } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

type Props = {
  src?: string
  background?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  src: '/models/UtensilsJar001.glb',
  background: null,
})

const container: Ref<HTMLDivElement | null> = ref(null)

let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let controls: OrbitControls | null = null
let animId: number | null = null

function cleanup() {
  if (animId != null) cancelAnimationFrame(animId)
  controls?.dispose()
  renderer?.dispose()
  renderer = null
  controls = null
  scene = null
  camera = null
}

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
  scene = new THREE.Scene()
  if (props.background === null) {
    scene.background = null
  } else if (typeof props.background === 'string') {
    scene.background = new THREE.Color(props.background)
  }

  // Camera
  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: props.background === null })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(width, height)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.shadowMap.enabled = true
  container.value.appendChild(renderer.domElement)

  // Lights
  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0)
  hemi.position.set(0, 1, 0)
  scene.add(hemi)

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.2)
  dirLight.position.set(5, 10, 7)
  dirLight.castShadow = true
  scene.add(dirLight)

  // Controls
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true

  // Ground (optional subtle)
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(10, 64),
    new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 1, metalness: 0 })
  )
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -0.001
  ground.receiveShadow = true
  scene.add(ground)

  // Load model
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
      fitCameraToObject(camera!, root)
    },
    undefined,
    (err) => {
      console.error('Failed to load GLB:', err)
    }
  )

  // Animate
  const tick = () => {
    controls?.update()
    renderer?.render(scene!, camera!)
    animId = requestAnimationFrame(tick)
  }
  tick()

  // Resize
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
    window.removeEventListener('resize', onResize)
    cleanup()
  })
})

watch(
  () => props.src,
  () => {
    // Could implement dynamic reloading if needed in the future
  }
)
</script>

<template>
  <div ref="container" class="viewer"></div>
  <div class="hint">拖拽旋转，滚轮缩放</div>
  
</template>

<style scoped>
.viewer {
  width: 100%;
  height: 70vh;
  display: block;
  position: relative;
}
.hint {
  font-size: 12px;
  color: #666;
  margin-top: 8px;
}
</style>
