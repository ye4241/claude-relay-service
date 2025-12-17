<template>
  <div
    class="relative flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 dark:bg-gray-900 sm:px-6 lg:px-8"
  >
    <div class="w-full max-w-md space-y-8">
      <div>
        <div class="mx-auto flex h-12 w-auto items-center justify-center">
          <svg
            class="h-8 w-8 text-blue-600 dark:text-blue-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
            />
          </svg>
          <span class="ml-2 text-xl font-bold text-gray-900 dark:text-white">SSO 登录</span>
        </div>
        <h2 class="mt-6 text-center text-2xl font-extrabold text-gray-900 dark:text-white">
          {{ statusMessage }}
        </h2>
      </div>

      <div class="rounded-lg bg-white px-6 py-8 shadow dark:bg-gray-800 dark:shadow-xl">
        <!-- 加载状态 -->
        <div v-if="loading" class="flex flex-col items-center space-y-4 py-4">
          <svg
            class="h-10 w-10 animate-spin text-blue-500"
            fill="none"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            ></circle>
            <path
              class="opacity-75"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              fill="currentColor"
            ></path>
          </svg>
          <p class="text-sm text-gray-500 dark:text-gray-400">正在验证登录状态...</p>
        </div>

        <!-- 错误状态 -->
        <div
          v-if="error"
          class="rounded-md border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20"
        >
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path
                  clip-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  fill-rule="evenodd"
                />
              </svg>
            </div>
            <div class="ml-3">
              <p class="text-sm text-red-700 dark:text-red-400">{{ error }}</p>
            </div>
          </div>
        </div>

        <!-- 返回登录按钮 -->
        <div v-if="error" class="mt-6 text-center">
          <button
            class="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-500 dark:hover:bg-blue-600 dark:focus:ring-offset-gray-800"
            @click="goToLogin"
          >
            <svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
              />
            </svg>
            返回登录
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useThemeStore } from '@/stores/theme'
import { showToast } from '@/utils/toast'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
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
    await userStore.handleOidcCallback(token)

    showToast('登录成功!', 'success')
    // 跳转到用户仪表板
    router.push('/user-dashboard')
  } catch (err) {
    error.value = err.message || 'SSO 登录处理失败'
    statusMessage.value = '登录失败'
  } finally {
    loading.value = false
  }
})

const goToLogin = () => {
  router.push('/user-login')
}
</script>

<style scoped>
/* 组件特定样式 */
</style>
