<template>
  <div
    class="relative flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 dark:bg-gray-900 sm:px-6 lg:px-8"
  >
    <!-- 主题切换按钮 -->
    <div class="fixed right-4 top-4 z-10">
      <ThemeToggle mode="dropdown" />
    </div>

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
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
            />
          </svg>
          <span class="ml-2 text-xl font-bold text-gray-900 dark:text-white">Claude Relay</span>
        </div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
          用户登录
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          登录账户管理您的 API Keys
        </p>
      </div>

      <div class="rounded-lg bg-white px-6 py-8 shadow dark:bg-gray-800 dark:shadow-xl">
        <!-- 加载状态 -->
        <div v-if="configLoading" class="flex items-center justify-center py-8">
          <svg
            class="h-8 w-8 animate-spin text-blue-500"
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
        </div>

        <!-- LDAP 登录表单 -->
        <form v-if="!configLoading && showLdapLogin" class="space-y-6" @submit.prevent="handleLogin">
          <div>
            <label
              class="block text-sm font-medium text-gray-700 dark:text-gray-300"
              for="username"
            >
              用户名
            </label>
            <div class="mt-1">
              <input
                id="username"
                v-model="form.username"
                autocomplete="username"
                class="relative block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-400 dark:focus:ring-blue-400 sm:text-sm"
                :disabled="loading"
                name="username"
                placeholder="请输入用户名"
                required
                type="text"
              />
            </div>
          </div>

          <div>
            <label
              class="block text-sm font-medium text-gray-700 dark:text-gray-300"
              for="password"
            >
              密码
            </label>
            <div class="mt-1">
              <input
                id="password"
                v-model="form.password"
                autocomplete="current-password"
                class="relative block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-400 dark:focus:ring-blue-400 sm:text-sm"
                :disabled="loading"
                name="password"
                placeholder="请输入密码"
                required
                type="password"
              />
            </div>
          </div>

          <div>
            <button
              class="group relative flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600 dark:focus:ring-blue-400 dark:focus:ring-offset-gray-800"
              :disabled="loading || !form.username || !form.password"
              type="submit"
            >
              <span v-if="loading" class="absolute inset-y-0 left-0 flex items-center pl-3">
                <svg
                  class="h-5 w-5 animate-spin text-white"
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
              </span>
              {{ loading ? '登录中...' : '登录' }}
            </button>
          </div>
        </form>

        <!-- OIDC/SSO 登录按钮 -->
        <div v-if="!configLoading && showOidcLogin" :class="{ 'mt-6': showLdapLogin }">
          <!-- 分隔线（当同时显示 LDAP 和 OIDC 时） -->
          <div v-if="showLdapLogin" class="relative mb-6">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-gray-300 dark:border-gray-600" />
            </div>
            <div class="relative flex justify-center text-sm">
              <span class="bg-white px-2 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                或
              </span>
            </div>
          </div>

          <button
            class="group relative flex w-full justify-center rounded-md border px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            :class="
              showLdapLogin
                ? 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 dark:focus:ring-offset-gray-800'
                : 'border-transparent bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600 dark:focus:ring-blue-400 dark:focus:ring-offset-gray-800'
            "
            :disabled="oidcLoading"
            type="button"
            @click="handleOidcLogin"
          >
            <span v-if="oidcLoading" class="absolute inset-y-0 left-0 flex items-center pl-3">
              <svg
                class="h-5 w-5 animate-spin"
                :class="showLdapLogin ? 'text-gray-500' : 'text-white'"
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
            </span>
            <svg
              v-if="!oidcLoading"
              class="mr-2 h-5 w-5"
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
            {{ oidcLoading ? '正在跳转...' : 'SSO 单点登录' }}
          </button>
        </div>

        <!-- 没有可用的登录方式时显示提示 -->
        <div
          v-if="!configLoading && !showLdapLogin && !showOidcLogin"
          class="py-4 text-center text-sm text-gray-500 dark:text-gray-400"
        >
          <svg
            class="mx-auto mb-2 h-8 w-8 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
            />
          </svg>
          暂无可用的登录方式，请联系管理员
        </div>

        <!-- 错误提示 -->
        <div
          v-if="error"
          class="mt-4 rounded-md border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20"
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

        <!-- 管理员登录入口 -->
        <div class="mt-6 text-center">
          <router-link
            class="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
            to="/login"
          >
            管理员登录
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useThemeStore } from '@/stores/theme'
import { showToast } from '@/utils/toast'
import ThemeToggle from '@/components/common/ThemeToggle.vue'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const themeStore = useThemeStore()

const loading = ref(false)
const oidcLoading = ref(false)
const configLoading = ref(true)
const error = ref('')
const authConfig = ref({
  ldapEnabled: false,
  oidcEnabled: false
})

const form = reactive({
  username: '',
  password: ''
})

// 计算是否显示各种登录方式
const showLdapLogin = computed(() => authConfig.value.ldapEnabled)
const showOidcLogin = computed(() => authConfig.value.oidcEnabled)

// 加载认证配置
const loadAuthConfig = async () => {
  configLoading.value = true
  try {
    const config = await userStore.getAuthConfig()
    authConfig.value = config
  } catch (err) {
    console.error('Failed to load auth config:', err)
    // 默认显示 LDAP 登录
    authConfig.value = { ldapEnabled: true, oidcEnabled: false }
  } finally {
    configLoading.value = false
  }
}

const handleLogin = async () => {
  if (!form.username || !form.password) {
    error.value = '请输入用户名和密码'
    return
  }

  loading.value = true
  error.value = ''

  try {
    await userStore.login({
      username: form.username,
      password: form.password
    })

    showToast('登录成功!', 'success')
    router.push('/user-dashboard')
  } catch (err) {
    console.error('Login error:', err)
    error.value = err.response?.data?.message || err.message || '登录失败'
  } finally {
    loading.value = false
  }
}

const handleOidcLogin = async () => {
  oidcLoading.value = true
  error.value = ''

  try {
    await userStore.oidcLogin()
    // oidcLogin 会跳转到 OIDC 提供商，不需要额外处理
  } catch (err) {
    console.error('OIDC login error:', err)
    error.value = err.message || 'SSO 登录初始化失败'
    oidcLoading.value = false
  }
}

onMounted(async () => {
  // 初始化主题
  themeStore.initTheme()

  // 加载认证配置
  await loadAuthConfig()

  // 检查 URL 中是否有错误参数（OIDC 回调错误）
  const errorParam = route.query.error
  if (errorParam) {
    error.value = decodeURIComponent(errorParam)
  }
})
</script>

<style scoped>
/* 组件特定样式 */
</style>
