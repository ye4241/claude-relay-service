import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import router from '@/router'
import { apiClient } from '@/config/api'

export const useAuthStore = defineStore('auth', () => {
  // 状态
  const isLoggedIn = ref(false)
  const authToken = ref(localStorage.getItem('authToken') || '')
  const username = ref('')
  const loginError = ref('')
  const loginLoading = ref(false)
  const oidcLoading = ref(false)
  const oemSettings = ref({
    siteName: 'Claude Relay Service',
    siteIcon: '',
    siteIconData: '',
    faviconData: '',
    // 认证配置
    userManagementEnabled: false,
    ldapEnabled: false,
    oidcEnabled: false,
    authMethods: []
  })
  const oemLoading = ref(true)

  // 计算属性
  const isAuthenticated = computed(() => !!authToken.value && isLoggedIn.value)
  const token = computed(() => authToken.value)
  const user = computed(() => ({ username: username.value }))

  // 方法
  async function login(credentials) {
    loginLoading.value = true
    loginError.value = ''

    try {
      const result = await apiClient.post('/web/auth/login', credentials)

      if (result.success) {
        authToken.value = result.token
        username.value = result.username || credentials.username
        isLoggedIn.value = true
        localStorage.setItem('authToken', result.token)

        await router.push('/dashboard')
      } else {
        loginError.value = result.message || '登录失败'
      }
    } catch (error) {
      loginError.value = error.message || '登录失败，请检查用户名和密码'
    } finally {
      loginLoading.value = false
    }
  }

  // OIDC 登录 - 获取授权 URL 并跳转
  async function oidcLogin() {
    oidcLoading.value = true
    loginError.value = ''

    try {
      const result = await apiClient.get('/users/oidc/auth-url')

      if (result.success && result.authUrl) {
        // 跳转到 OIDC 授权页面
        window.location.href = result.authUrl
      } else {
        loginError.value = result.message || 'SSO 登录初始化失败'
        oidcLoading.value = false
      }
    } catch (error) {
      loginError.value = error.message || 'SSO 登录初始化失败'
      oidcLoading.value = false
    }
  }

  // OIDC 回调处理 - 验证 token 并完成登录
  async function handleOidcCallback(sessionToken) {
    loginLoading.value = true
    loginError.value = ''

    try {
      const result = await apiClient.post('/users/oidc/verify-token', { sessionToken })

      if (result.success) {
        authToken.value = result.sessionToken
        username.value = result.user?.username || ''
        isLoggedIn.value = true
        localStorage.setItem('authToken', result.sessionToken)

        await router.push('/dashboard')
        return true
      } else {
        loginError.value = result.message || 'SSO 登录验证失败'
        return false
      }
    } catch (error) {
      loginError.value = error.message || 'SSO 登录验证失败'
      return false
    } finally {
      loginLoading.value = false
    }
  }

  function logout() {
    isLoggedIn.value = false
    authToken.value = ''
    username.value = ''
    localStorage.removeItem('authToken')
    router.push('/login')
  }

  function checkAuth() {
    if (authToken.value) {
      isLoggedIn.value = true
      // 验证token有效性
      verifyToken()
    }
  }

  async function verifyToken() {
    try {
      // 获取当前用户信息
      const userResult = await apiClient.get('/web/auth/user')
      if (userResult.success && userResult.user) {
        username.value = userResult.user.username
      }

      // 使用 dashboard 端点来验证 token
      // 如果 token 无效，会抛出错误
      const result = await apiClient.get('/admin/dashboard')
      if (!result.success) {
        logout()
      }
    } catch (error) {
      // token 无效，需要重新登录
      logout()
    }
  }

  async function loadOemSettings() {
    oemLoading.value = true
    try {
      const result = await apiClient.get('/admin/oem-settings')
      if (result.success && result.data) {
        oemSettings.value = { ...oemSettings.value, ...result.data }

        // 设置favicon
        if (result.data.siteIconData || result.data.siteIcon) {
          const link = document.querySelector("link[rel*='icon']") || document.createElement('link')
          link.type = 'image/x-icon'
          link.rel = 'shortcut icon'
          link.href = result.data.siteIconData || result.data.siteIcon
          document.getElementsByTagName('head')[0].appendChild(link)
        }

        // 设置页面标题
        if (result.data.siteName) {
          document.title = `${result.data.siteName} - 管理后台`
        }
      }
    } catch (error) {
      console.error('加载OEM设置失败:', error)
    } finally {
      oemLoading.value = false
    }
  }

  return {
    // 状态
    isLoggedIn,
    authToken,
    username,
    loginError,
    loginLoading,
    oidcLoading,
    oemSettings,
    oemLoading,

    // 计算属性
    isAuthenticated,
    token,
    user,

    // 方法
    login,
    oidcLogin,
    handleOidcCallback,
    logout,
    checkAuth,
    loadOemSettings
  }
})
