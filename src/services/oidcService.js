const crypto = require('crypto')
const logger = require('../utils/logger')
const config = require('../../config/config')
const userService = require('./userService')

class OidcService {
  constructor() {
    this.config = config.oidc || {}
    this.stateStore = new Map() // 存储 state -> { codeVerifier, nonce, createdAt }
    this.STATE_TTL = 10 * 60 * 1000 // 10分钟过期
  }

  // 🔍 验证 OIDC 配置
  validateConfiguration() {
    const errors = []

    if (!this.config.issuerUrl) {
      errors.push('OIDC issuer URL is not configured')
    }
    if (!this.config.clientId) {
      errors.push('OIDC client ID is not configured')
    }
    if (!this.config.clientSecret) {
      errors.push('OIDC client secret is not configured')
    }
    if (!this.config.redirectUri) {
      errors.push('OIDC redirect URI is not configured')
    }

    if (errors.length > 0) {
      logger.error('❌ OIDC configuration validation failed:', errors)
      return false
    }

    logger.info('✅ OIDC configuration validation passed')
    return true
  }

  // 🔑 生成 PKCE code verifier
  generateCodeVerifier() {
    return crypto.randomBytes(32).toString('base64url')
  }

  // 🔑 生成 PKCE code challenge
  generateCodeChallenge(codeVerifier) {
    return crypto.createHash('sha256').update(codeVerifier).digest('base64url')
  }

  // 🔑 生成随机 state
  generateState() {
    return crypto.randomBytes(16).toString('hex')
  }

  // 🔑 生成随机 nonce
  generateNonce() {
    return crypto.randomBytes(16).toString('hex')
  }

  // 🔗 获取 OIDC 发现文档
  async getDiscoveryDocument() {
    try {
      const discoveryUrl = `${this.config.issuerUrl}/.well-known/openid-configuration`
      const response = await fetch(discoveryUrl, {
        headers: {
          Accept: 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch discovery document: ${response.status}`)
      }

      const doc = await response.json()
      return doc
    } catch (error) {
      logger.error('❌ Failed to fetch OIDC discovery document:', error)
      throw error
    }
  }

  // 🔗 生成授权 URL
  async generateAuthUrl() {
    if (!this.config.enabled) {
      throw new Error('OIDC is not enabled')
    }

    try {
      const discovery = await this.getDiscoveryDocument()
      const authorizationEndpoint = discovery.authorization_endpoint

      const state = this.generateState()
      const nonce = this.generateNonce()
      const codeVerifier = this.generateCodeVerifier()
      const codeChallenge = this.generateCodeChallenge(codeVerifier)

      // 存储 state 和 code verifier
      this.stateStore.set(state, {
        codeVerifier,
        nonce,
        createdAt: Date.now()
      })

      // 清理过期的 state
      this.cleanupExpiredStates()

      // 构建授权 URL
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: this.config.clientId,
        redirect_uri: this.config.redirectUri,
        scope: this.config.scope || 'openid profile email',
        state,
        nonce,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256'
      })

      const authUrl = `${authorizationEndpoint}?${params.toString()}`

      logger.debug('🔗 Generated OIDC authorization URL')

      return {
        authUrl,
        state
      }
    } catch (error) {
      logger.error('❌ Failed to generate OIDC auth URL:', error)
      throw error
    }
  }

  // 🔄 清理过期的 state
  cleanupExpiredStates() {
    const now = Date.now()
    for (const [state, data] of this.stateStore.entries()) {
      if (now - data.createdAt > this.STATE_TTL) {
        this.stateStore.delete(state)
      }
    }
  }

  // 🔄 用授权码交换 token
  async exchangeCodeForTokens(code, state) {
    if (!this.config.enabled) {
      throw new Error('OIDC is not enabled')
    }

    // 验证 state
    const stateData = this.stateStore.get(state)
    if (!stateData) {
      throw new Error('Invalid or expired state')
    }

    // 检查 state 是否过期
    if (Date.now() - stateData.createdAt > this.STATE_TTL) {
      this.stateStore.delete(state)
      throw new Error('State has expired')
    }

    // 删除已使用的 state
    this.stateStore.delete(state)

    try {
      const discovery = await this.getDiscoveryDocument()
      const tokenEndpoint = discovery.token_endpoint

      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.config.redirectUri,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code_verifier: stateData.codeVerifier
      })

      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json'
        },
        body: params.toString()
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          `Token exchange failed: ${response.status} - ${errorData.error_description || errorData.error || 'Unknown error'}`
        )
      }

      const tokens = await response.json()

      // 验证 id_token
      const userInfo = await this.verifyIdToken(tokens.id_token, stateData.nonce, discovery)

      return {
        tokens,
        userInfo
      }
    } catch (error) {
      logger.error('❌ OIDC token exchange failed:', error)
      throw error
    }
  }

  // 🔍 验证 ID Token（简化版，不验证签名）
  async verifyIdToken(idToken, expectedNonce, _discovery) {
    try {
      // 解析 JWT
      const parts = idToken.split('.')
      if (parts.length !== 3) {
        throw new Error('Invalid ID token format')
      }

      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())

      // 验证 issuer
      if (payload.iss !== this.config.issuerUrl) {
        throw new Error('Invalid issuer')
      }

      // 验证 audience
      if (payload.aud !== this.config.clientId) {
        throw new Error('Invalid audience')
      }

      // 验证 nonce
      if (payload.nonce !== expectedNonce) {
        throw new Error('Invalid nonce')
      }

      // 验证过期时间
      const now = Math.floor(Date.now() / 1000)
      if (payload.exp && payload.exp < now) {
        throw new Error('ID token has expired')
      }

      return payload
    } catch (error) {
      logger.error('❌ ID token verification failed:', error)
      throw error
    }
  }

  // 🔍 获取用户信息（从 userinfo 端点）
  async getUserInfo(accessToken) {
    try {
      const discovery = await this.getDiscoveryDocument()
      const userinfoEndpoint = discovery.userinfo_endpoint

      if (!userinfoEndpoint) {
        throw new Error('Userinfo endpoint not found in discovery document')
      }

      const response = await fetch(userinfoEndpoint, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch user info: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      logger.error('❌ Failed to fetch OIDC user info:', error)
      throw error
    }
  }

  // 📝 提取用户信息用于本地用户创建
  extractUserInfo(idTokenPayload, userInfoResponse) {
    // 合并 ID token 和 userinfo 响应的信息
    const combined = { ...idTokenPayload, ...userInfoResponse }

    // 根据配置的属性映射提取用户信息
    const mapping = this.config.userMapping || {}

    const username =
      combined[mapping.username] ||
      combined.preferred_username ||
      combined.sub ||
      combined.email?.split('@')[0]

    const userInfo = {
      username,
      email: combined[mapping.email] || combined.email || '',
      displayName:
        combined[mapping.displayName] || combined.name || combined.preferred_username || username,
      firstName: combined[mapping.firstName] || combined.given_name || '',
      lastName: combined[mapping.lastName] || combined.family_name || '',
      oidcSub: combined.sub // 保存 OIDC subject 用于将来的匹配
    }

    logger.debug('📋 Extracted OIDC user info:', {
      username: userInfo.username,
      displayName: userInfo.displayName,
      email: userInfo.email
    })

    return userInfo
  }

  // 🔐 完成 OIDC 登录流程
  async authenticateWithCode(code, state) {
    if (!this.config.enabled) {
      throw new Error('OIDC authentication is not enabled')
    }

    try {
      // 1. 交换 token
      const { tokens, userInfo: idTokenInfo } = await this.exchangeCodeForTokens(code, state)

      // 2. 获取更详细的用户信息
      let userInfoResponse = {}
      try {
        userInfoResponse = await this.getUserInfo(tokens.access_token)
      } catch (error) {
        logger.warn('⚠️ Failed to fetch userinfo, using ID token claims only:', error.message)
      }

      // 3. 提取用户信息
      const extractedUserInfo = this.extractUserInfo(idTokenInfo, userInfoResponse)

      // 4. 创建或更新本地用户
      const user = await userService.createOrUpdateUser(extractedUserInfo)

      // 5. 检查用户是否被禁用
      if (!user.isActive) {
        logger.security(`🔒 Disabled user OIDC login attempt: ${extractedUserInfo.username}`)
        return {
          success: false,
          message: 'Your account has been disabled. Please contact administrator.'
        }
      }

      // 6. 记录登录
      await userService.recordUserLogin(user.id)

      // 7. 创建用户会话
      const sessionToken = await userService.createUserSession(user.id)

      logger.info(`✅ OIDC authentication successful for user: ${extractedUserInfo.username}`)

      return {
        success: true,
        user,
        sessionToken,
        message: 'Authentication successful'
      }
    } catch (error) {
      logger.error('❌ OIDC authentication error:', {
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })

      return {
        success: false,
        message: error.message || 'OIDC authentication failed'
      }
    }
  }

  // 🔍 测试 OIDC 连接
  async testConnection() {
    if (!this.config.enabled) {
      return { success: false, message: 'OIDC is not enabled' }
    }

    try {
      const discovery = await this.getDiscoveryDocument()

      return {
        success: true,
        message: 'OIDC connection successful',
        issuer: discovery.issuer,
        authorizationEndpoint: discovery.authorization_endpoint,
        tokenEndpoint: discovery.token_endpoint,
        userinfoEndpoint: discovery.userinfo_endpoint
      }
    } catch (error) {
      logger.error('❌ OIDC connection test failed:', error)

      return {
        success: false,
        message: 'OIDC connection failed',
        error: error.message
      }
    }
  }

  // 📊 获取 OIDC 配置信息（不包含敏感信息）
  getConfigInfo() {
    return {
      enabled: this.config.enabled,
      issuerUrl: this.config.issuerUrl,
      clientId: this.config.clientId,
      redirectUri: this.config.redirectUri,
      scope: this.config.scope,
      userMapping: this.config.userMapping,
      // 不返回 clientSecret
      hasClientSecret: !!this.config.clientSecret
    }
  }
}

module.exports = new OidcService()
