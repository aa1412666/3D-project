import { describe, it, expect } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import App from '../App.vue'

describe('App', () => {
  it('renders page title and mounts with stubs', () => {
    const wrapper = shallowMount(App, {
      // 避免在 JSDOM 中真正创建 WebGL 上下文，stub 掉 3D 组件
      global: { stubs: { ModelViewer: true } },
    })

    // 标题应更新为“3D 模型展示”
    const h1 = wrapper.find('h1')
    expect(h1.exists()).toBe(true)
    expect(h1.text()).toBe('3D 模型展示')

    // 组件被成功 stub（不会抛出渲染错误）
    expect(wrapper.html()).toContain('model-viewer-stub')
  })
})
