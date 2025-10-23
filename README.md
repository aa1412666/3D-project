# 3D-project

一个使用 Vue 3 + TypeScript + Vite 构建的前端项目，集成了 Pinia（状态）、Vue Router（路由）、Vitest（单测）、Playwright（E2E）、ESLint + Prettier（代码质量），并通过 Three.js 加载展示 GLB 模型。

## 目录结构与职责

```
3D-project/
├─ index.html                 # 应用 HTML 入口（#app 挂载点，加载 /src/main.ts）
├─ package.json               # 依赖与脚本
├─ vite.config.ts             # Vite 配置（Vue/JSX/DevTools 插件，@ -> src 别名）
├─ tsconfig*.json             # TS 工程化配置（app/node/vitest）
├─ vitest.config.ts           # Vitest 单测配置（jsdom 环境）
├─ playwright.config.ts       # Playwright E2E 配置（dev server/端口等）
├─ eslint.config.ts           # ESLint Flat 配置（Vue/TS/Vitest/Playwright/Oxlint）
├─ public/
│  └─ models/                 # 放置 GLB 等静态资源（构建时原样拷贝）
└─ src/
   ├─ main.ts                 # 应用入口（创建 app，安装 Pinia/Router，挂载）
   ├─ App.vue                 # 根组件（已集成 <ModelViewer />）
   ├─ components/
   │  └─ ModelViewer.vue      # Three.js 3D 模型查看器（GLTFLoader + OrbitControls）
   ├─ router/
   │  └─ index.ts             # 路由（History 模式，当前 routes 为空）
   ├─ stores/
   │  └─ counter.ts           # Pinia 示例 store（count/doubleCount/increment）
   └─ __tests__/
      └─ App.spec.ts          # 单元测试示例（需要同步更新断言，见下文）
```

静态资源说明：`public/` 下文件会以原路径复制到构建产物中，可用绝对路径访问，如 `/models/UtensilsJar001.glb`。

## 启动流程（从 HTML 到页面）

1. `index.html` 提供容器 `<div id="app"></div>`，以 ES Module 方式引入 `/src/main.ts`。
2. `src/main.ts` 创建 Vue 应用，安装 Pinia/Router，最后 `app.mount('#app')`。
3. `src/App.vue` 为根组件，当前渲染 `<ModelViewer />`，用于展示 3D 模型。

## 3D 模型查看器：`src/components/ModelViewer.vue`

- 技术：Three.js + GLTFLoader（加载 GLB）+ OrbitControls（交互）
- Props：
  - `src?: string` 模型路径（默认 `/models/UtensilsJar001.glb`）
  - `background?: string | null` 背景：`null` 透明；或传颜色（如 `#20232a`）
- 功能：场景/相机/渲染器初始化，半球光+方向光，简易地面接收阴影；自适应窗口尺寸；卸载时清理；自动相机对焦（包围盒计算）。
- 使用：
  - 将模型放至 `public/models/UtensilsJar001.glb`
  - 在页面中：`<ModelViewer src="/models/UtensilsJar001.glb" />`
  - 可选背景：`<ModelViewer background="#20232a" />`

## 路由与状态

- 路由：`src/router/index.ts` 使用 `createWebHistory`，目前 `routes: []`，可按需新增页面与懒加载组件。
- 状态：示例 Pinia store 在 `src/stores/counter.ts`，提供 `count`、`doubleCount`、`increment`。

## 测试与质量

- 单元测试（Vitest + jsdom）：
  - 配置：`vitest.config.ts`；示例：`src/__tests__/App.spec.ts`
  - 注意：项目首页标题已改为“3D 模型展示”，示例测试仍断言 “You did it!”；需同步修改断言以匹配当前 UI。
- 端到端测试（Playwright）：
  - 配置：`playwright.config.ts`；示例：`e2e/vue.spec.ts`
  - 同样需要将断言更新为当前页面内容，或改为更鲁棒的检查（例如查找 3D 提示文案）。
- 代码质量：
  - ESLint Flat 配置整合了 Vue/TS/Vitest/Playwright/Oxlint；Prettier 负责格式化（`skipFormatting`）。

## 常用脚本

以下命令在项目根目录（本文件所在目录）执行：

```bat
npm install             
npm run dev             
npm run build           
npm run preview         
npm run test:unit       
npm run test:e2e        
npm run lint            
npm run format          
```

提示（Windows）：在 PowerShell 下若遇执行策略限制，可改用 `cmd` 终端或直接使用 `npm.cmd`。

## 常见问题

1) 模型不显示/404？
- 确保 GLB 放在 `public/models/UtensilsJar001.glb`，页面路径使用 `/models/UtensilsJar001.glb`。

2) 模型太大/太小？
- 可调整 `ModelViewer` 中 `fitCameraToObject` 的 `offset`，或在模型根节点上设置 `scale`。

3) 性能问题？
- 可降低像素比、关闭阴影或减少灯光数量；移动端可优先考虑透明背景关闭、减小地面细分度等。

---

更多配置可参考官方文档：
- Vite：https://vite.dev/config/
- Vue：https://vuejs.org/
- Three.js：https://threejs.org/
- Vitest：https://vitest.dev/
- Playwright：https://playwright.dev/
