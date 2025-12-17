<template>
  <div class="flex min-h-screen items-center justify-center p-4 sm:p-6">
    <div
      class="glass-strong w-full max-w-md rounded-xl p-6 shadow-2xl sm:rounded-2xl sm:p-8 md:rounded-3xl md:p-10"
    >
      <div class="mb-6 text-center sm:mb-8">
        <div
          class="mx-auto mb-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-gray-300/30 bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-sm sm:mb-6 sm:h-20 sm:w-20 sm:rounded-2xl"
        >
          <i class="fas fa-key text-2xl text-gray-700 sm:text-3xl" />
        </div>
        <h1 class="header-title mb-2 text-2xl font-bold text-white sm:text-3xl">SSO 登录</h1>
        <p class="text-base text-gray-600 dark:text-gray-400 sm:text-lg">
          {{ statusMessage }}
        </p>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="flex flex-col items-center space-y-4">
        <div class="loading-spinner h-8 w-8" />
        <p class="text-sm text-gray-500 dark:text-gray-400">正在验证登录状态...</p>
      </div>

      <!-- 错误状态 -->
      <div
        v-if="error"
        class="mt-4 rounded-lg border border-red-500/30 bg-red-500/20 p-3 text-center text-xs text-red-800 backdrop-blur-sm dark:text-red-400 sm:mt-6 sm:rounded-xl sm:p-4 sm:text-sm"
      >
        <i class="fas fa-exclamation-triangle mr-2" />{{ error }}
      </div>

      <!-- 返回登录按钮 -->
      <div v-if="error" class="mt-4 text-center">
        <button
          class="btn btn-secondary px-4 py-2 text-sm font-semibold"
          @click="goToLogin"
        >
          <i class="fas fa-arrow-left mr-2" />
          返回登录
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const themeStore = useThemeStore()

const loading = ref(true)
const error = ref('')
const statusMessage = ref('正在处理登录...')

onMounted(async () => {
  // 初始化主题
  themeStore.initTheme()

  // 获取 URL 参数
  const token = route.query.token
  const errorMsg = route.query.error

  if (errorMsg) {
    error.value = decodeURIComponent(errorMsg)
    statusMessage.value = '登录失败'
    loading.value = false
    return
  }

  if (!token) {
    error.value = '未收到有效的登录凭证'
    statusMessage.value = '登录失败'
    loading.value = false
    return
  }

  // 验证 token 并完成登录
  try {
    statusMessage.value = '正在验证登录状态...'
    const success = await authStore.handleOidcCallback(token)

    if (!success) {
      error.value = authStore.loginError || 'SSO 登录验证失败'
      statusMessage.value = '登录失败'
    }
    // 如果成功，handleOidcCallback 会自动跳转到 dashboard
  } catch (err) {
    error.value = err.message || 'SSO 登录处理失败'
    statusMessage.value = '登录失败'
  } finally {
    loading.value = false
  }
})

const goToLogin = () => {
  router.push('/login')
}
</script>

<style scoped>
/* 组件特定样式已经在全局样式中定义 */
</style>
