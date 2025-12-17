<template>
  <div class="flex min-h-screen items-center justify-center p-4 sm:p-6">
    <!-- 主题切换按钮 - 固定在右上角 -->
    <div class="fixed right-4 top-4 z-50">
      <ThemeToggle mode="dropdown" />
    </div>

    <div
      class="glass-strong w-full max-w-md rounded-xl p-6 shadow-2xl sm:rounded-2xl sm:p-8 md:rounded-3xl md:p-10"
    >
      <div class="mb-6 text-center sm:mb-8">
        <!-- 使用自定义布局来保持登录页面的居中大logo样式 -->
        <div
          class="mx-auto mb-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-gray-300/30 bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-sm sm:mb-6 sm:h-20 sm:w-20 sm:rounded-2xl"
        >
          <template v-if="!oemLoading">
            <img
              v-if="authStore.oemSettings.siteIconData || authStore.oemSettings.siteIcon"
              alt="Logo"
              class="h-10 w-10 object-contain sm:h-12 sm:w-12"
              :src="authStore.oemSettings.siteIconData || authStore.oemSettings.siteIcon"
              @error="(e) => (e.target.style.display = 'none')"
            />
            <i v-else class="fas fa-cloud text-2xl text-gray-700 sm:text-3xl" />
          </template>
          <div v-else class="h-10 w-10 animate-pulse rounded bg-gray-300/50 sm:h-12 sm:w-12" />
        </div>
        <template v-if="!oemLoading && authStore.oemSettings.siteName">
          <h1 class="header-title mb-2 text-2xl font-bold text-white sm:text-3xl">
            {{ authStore.oemSettings.siteName }}
          </h1>
        </template>
        <div
          v-else-if="oemLoading"
          class="mx-auto mb-2 h-8 w-48 animate-pulse rounded bg-gray-300/50 sm:h-9 sm:w-64"
        />
        <p class="text-base text-gray-600 dark:text-gray-400 sm:text-lg">管理后台</p>
      </div>

      <!-- LDAP 登录表单 -->
      <form v-if="showLdapLogin" class="space-y-4 sm:space-y-6" @submit.prevent="handleLogin">
        <div>
          <label
            class="mb-2 block text-sm font-semibold text-gray-900 dark:text-gray-100 sm:mb-3"
            for="username"
            >用户名</label
          >
          <input
            id="username"
            v-model="loginForm.username"
            autocomplete="username"
            class="form-input w-full"
            name="username"
            placeholder="请输入用户名"
            required
            type="text"
          />
        </div>

        <div>
          <label
            class="mb-2 block text-sm font-semibold text-gray-900 dark:text-gray-100 sm:mb-3"
            for="password"
            >密码</label
          >
          <input
            id="password"
            v-model="loginForm.password"
            autocomplete="current-password"
            class="form-input w-full"
            name="password"
            placeholder="请输入密码"
            required
            type="password"
          />
        </div>

        <button
          class="btn btn-primary w-full px-4 py-3 text-base font-semibold sm:px-6 sm:py-4 sm:text-lg"
          :disabled="authStore.loginLoading"
          type="submit"
        >
          <i v-if="!authStore.loginLoading" class="fas fa-sign-in-alt mr-2" />
          <div v-if="authStore.loginLoading" class="loading-spinner mr-2" />
          {{ authStore.loginLoading ? '登录中...' : '登录' }}
        </button>
      </form>

      <!-- OIDC/SSO 登录按钮 -->
      <div v-if="showOidcLogin" :class="{ 'mt-4 sm:mt-6': showLdapLogin }">
        <!-- 分隔线（当同时显示 LDAP 和 OIDC 时） -->
        <div v-if="showLdapLogin && showOidcLogin" class="relative mb-4 sm:mb-6">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-gray-300 dark:border-gray-600" />
          </div>
          <div class="relative flex justify-center text-sm">
            <span class="bg-white/80 px-2 text-gray-500 dark:bg-gray-800/80 dark:text-gray-400">
              或
            </span>
          </div>
        </div>

        <button
          class="btn w-full px-4 py-3 text-base font-semibold sm:px-6 sm:py-4 sm:text-lg"
          :class="showLdapLogin ? 'btn-secondary' : 'btn-primary'"
          :disabled="authStore.oidcLoading"
          type="button"
          @click="handleOidcLogin"
        >
          <i v-if="!authStore.oidcLoading" class="fas fa-key mr-2" />
          <div v-if="authStore.oidcLoading" class="loading-spinner mr-2" />
          {{ authStore.oidcLoading ? '正在跳转...' : 'SSO 单点登录' }}
        </button>
      </div>

      <!-- 没有可用的登录方式时显示提示 -->
      <div
        v-if="!oemLoading && !showLdapLogin && !showOidcLogin"
        class="text-center text-sm text-gray-500 dark:text-gray-400"
      >
        <i class="fas fa-info-circle mr-2" />
        暂无可用的登录方式，请联系管理员
      </div>

      <div
        v-if="authStore.loginError"
        class="mt-4 rounded-lg border border-red-500/30 bg-red-500/20 p-3 text-center text-xs text-red-800 backdrop-blur-sm dark:text-red-400 sm:mt-6 sm:rounded-xl sm:p-4 sm:text-sm"
      >
        <i class="fas fa-exclamation-triangle mr-2" />{{ authStore.loginError }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import ThemeToggle from '@/components/common/ThemeToggle.vue'

const route = useRoute()
const authStore = useAuthStore()
const themeStore = useThemeStore()
const oemLoading = computed(() => authStore.oemLoading)

// 计算是否显示各种登录方式
const showLdapLogin = computed(() => {
  return (
    authStore.oemSettings.userManagementEnabled && authStore.oemSettings.ldapEnabled && !oemLoading.value
  )
})

const showOidcLogin = computed(() => {
  return (
    authStore.oemSettings.userManagementEnabled && authStore.oemSettings.oidcEnabled && !oemLoading.value
  )
})

const loginForm = ref({
  username: '',
  password: ''
})

onMounted(() => {
  // 初始化主题
  themeStore.initTheme()
  // 加载OEM设置
  authStore.loadOemSettings()

  // 检查 URL 中是否有错误参数（OIDC 回调错误）
  const error = route.query.error
  if (error) {
    authStore.loginError = decodeURIComponent(error)
  }
})

const handleLogin = async () => {
  await authStore.login(loginForm.value)
}

const handleOidcLogin = async () => {
  await authStore.oidcLogin()
}
</script>

<style scoped>
/* 组件特定样式已经在全局样式中定义 */
</style>
