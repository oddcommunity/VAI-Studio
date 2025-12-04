import React, { useState, useCallback } from 'react'
import { YStack, XStack, Text, Button, H3 } from '@odd-design-system/ui-components'
import { Input, Sheet, Spinner } from 'tamagui'
import {
  X,
  Key,
  CheckCircle,
  ExternalLink,
  LogOut,
  User,
} from '@tamagui/lucide-icons'
import { Z_INDEX } from '../constants/zIndex'
import { useToastStore } from '../stores/useToastStore'
import { authService } from '../services/auth.service'

interface AuthModalProps {
  open: boolean
  onClose: () => void
}

type AuthMode = 'hf-token' | 'supabase'

export function AuthModal({ open, onClose }: AuthModalProps) {
  const { showToast } = useToastStore()
  const [mode, setMode] = useState<AuthMode>('hf-token')

  // HuggingFace token state
  const [hfToken, setHfToken] = useState('')
  const [hfUsername, setHfUsername] = useState<string | null>(null)
  const [hfLoading, setHfLoading] = useState(false)
  const [hfTesting, setHfTesting] = useState(false)

  // Supabase auth state
  const [email, setEmail] = useState('')
  const [supabaseLoading, setSupabaseLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  // Load HF token on modal open
  React.useEffect(() => {
    if (open) {
      loadHfToken()
    }
  }, [open])

  const loadHfToken = useCallback(async () => {
    setHfLoading(true)
    try {
      const result = await authService.getHFToken()
      if (result.success && result.token) {
        setHfToken(result.token)
        // Test the token to get username
        const testResult = await authService.testHFToken(result.token)
        if (testResult.success && testResult.valid) {
          setHfUsername(testResult.username || null)
        }
      }
    } catch (error) {
      console.error('Failed to load HF token:', error)
    } finally {
      setHfLoading(false)
    }
  }, [])

  const handleTestHfToken = useCallback(async () => {
    if (!hfToken.trim()) {
      showToast('Please enter a token', 'warning', 2000)
      return
    }

    setHfTesting(true)
    try {
      const result = await authService.testHFToken(hfToken)
      if (result.success && result.valid) {
        setHfUsername(result.username || null)
        showToast(`Token valid! Logged in as ${result.username}`, 'success', 3000)
      } else {
        showToast('Invalid token', 'error', 3000)
        setHfUsername(null)
      }
    } catch (error) {
      showToast('Failed to test token', 'error', 3000)
    } finally {
      setHfTesting(false)
    }
  }, [hfToken, showToast])

  const handleSaveHfToken = useCallback(async () => {
    if (!hfToken.trim()) {
      showToast('Please enter a token', 'warning', 2000)
      return
    }

    setHfLoading(true)
    try {
      const result = await authService.saveHFToken(hfToken)
      if (result.success) {
        showToast('Token saved successfully', 'success', 2000)
      } else {
        showToast(result.error || 'Failed to save token', 'error', 3000)
      }
    } catch (error) {
      showToast('Failed to save token', 'error', 3000)
    } finally {
      setHfLoading(false)
    }
  }, [hfToken, showToast])

  const handleClearHfToken = useCallback(async () => {
    setHfLoading(true)
    try {
      const result = await authService.clearHFToken()
      if (result.success) {
        setHfToken('')
        setHfUsername(null)
        showToast('Token cleared', 'info', 2000)
      }
    } catch (error) {
      showToast('Failed to clear token', 'error', 3000)
    } finally {
      setHfLoading(false)
    }
  }, [showToast])

  const handleOpenHfPage = useCallback(async () => {
    try {
      await authService.openHFTokenPage()
    } catch (error) {
      showToast('Failed to open browser', 'error', 3000)
    }
  }, [showToast])

  const handleSupabaseSignIn = useCallback(async () => {
    if (!email.trim() || !email.includes('@')) {
      showToast('Please enter a valid email', 'warning', 2000)
      return
    }

    setSupabaseLoading(true)
    try {
      const result = await authService.signInWithEmail(email)
      if (result.success) {
        setEmailSent(true)
        showToast('Check your email for the magic link!', 'success', 5000)
      } else {
        showToast(result.error || 'Failed to send magic link', 'error', 3000)
      }
    } catch (error) {
      showToast('Failed to sign in', 'error', 3000)
    } finally {
      setSupabaseLoading(false)
    }
  }, [email, showToast])

  return (
    <Sheet
      modal
      open={open}
      onOpenChange={(isOpen: boolean) => !isOpen && onClose()}
      snapPoints={[70]}
      dismissOnSnapToBottom
      zIndex={Z_INDEX.MODAL}
    >
      <Sheet.Overlay backgroundColor="rgba(0,0,0,0.75)" />
      <Sheet.Frame backgroundColor="$secondary1" borderTopLeftRadius={16} borderTopRightRadius={16}>
        <Sheet.Handle backgroundColor="$secondary4" />

        {/* Header */}
        <XStack
          padding={20}
          borderBottomWidth={1}
          borderBottomColor="$secondary3"
          alignItems="center"
          justifyContent="space-between"
        >
          <XStack alignItems="center" gap={12}>
            <Key size={24} color="$secondary9" />
            <Text fontSize={18} fontWeight="600" color="$secondary11">
              Authentication
            </Text>
          </XStack>
          <Button
            size="$3"
            circular
            chromeless
            onPress={onClose}
            hoverStyle={{ backgroundColor: '$secondary3' }}
          >
            <X size={20} color="$secondary7" />
          </Button>
        </XStack>

        {/* Mode Tabs */}
        <XStack padding={20} paddingBottom={0} gap={8}>
          <Button
            flex={1}
            size="$3"
            backgroundColor={mode === 'hf-token' ? '$primary6' : '$secondary3'}
            hoverStyle={{
              backgroundColor: mode === 'hf-token' ? '$primary5' : '$secondary4',
            }}
            onPress={() => setMode('hf-token')}
          >
            <Text
              fontSize={13}
              fontWeight="500"
              color={mode === 'hf-token' ? '#FFFFFF' : '$secondary9'}
            >
              HuggingFace Token
            </Text>
          </Button>
          <Button
            flex={1}
            size="$3"
            backgroundColor={mode === 'supabase' ? '$primary6' : '$secondary3'}
            hoverStyle={{
              backgroundColor: mode === 'supabase' ? '$primary5' : '$secondary4',
            }}
            onPress={() => setMode('supabase')}
          >
            <Text
              fontSize={13}
              fontWeight="500"
              color={mode === 'supabase' ? '#FFFFFF' : '$secondary9'}
            >
              Cloud Sync
            </Text>
          </Button>
        </XStack>

        {/* Content */}
        <YStack flex={1} padding={20} gap={20}>
          {mode === 'hf-token' ? (
            <>
              <Text fontSize={13} color="$secondary7" lineHeight={20}>
                A HuggingFace token is required to access gated models like Whisper Large.
                Get your token from the HuggingFace settings page.
              </Text>

              {hfUsername && (
                <XStack
                  backgroundColor="hsla(142, 76%, 36%, 0.1)"
                  padding={12}
                  borderRadius={8}
                  alignItems="center"
                  gap={12}
                >
                  <CheckCircle size={20} color="hsl(142, 76%, 36%)" />
                  <YStack flex={1}>
                    <Text fontSize={14} fontWeight="500" color="hsl(142, 76%, 36%)">
                      Connected
                    </Text>
                    <Text fontSize={12} color="$secondary7">
                      Logged in as {hfUsername}
                    </Text>
                  </YStack>
                  <Button
                    size="$2"
                    chromeless
                    onPress={handleClearHfToken}
                    disabled={hfLoading}
                    icon={<LogOut size={14} color="$secondary7" />}
                  >
                    <Text fontSize={12} color="$secondary7">
                      Disconnect
                    </Text>
                  </Button>
                </XStack>
              )}

              <YStack gap={8}>
                <Text fontSize={12} fontWeight="500" color="$secondary9">
                  Access Token
                </Text>
                <Input
                  value={hfToken}
                  onChangeText={setHfToken}
                  placeholder="hf_xxxxxxxxxxxxxxxxxxxx"
                  secureTextEntry
                  backgroundColor="$secondary3"
                  borderWidth={0}
                  borderRadius={8}
                  paddingHorizontal={12}
                  paddingVertical={12}
                  fontSize={14}
                  color="$secondary11"
                  placeholderTextColor="$secondary5"
                />
              </YStack>

              <XStack gap={12}>
                <Button
                  flex={1}
                  size="$4"
                  backgroundColor="$secondary3"
                  hoverStyle={{ backgroundColor: '$secondary4' }}
                  onPress={handleTestHfToken}
                  disabled={hfTesting || !hfToken.trim()}
                  icon={hfTesting ? <Spinner size="small" /> : undefined}
                >
                  <Text fontSize={14} color="$secondary9">
                    Test Token
                  </Text>
                </Button>
                <Button
                  flex={1}
                  size="$4"
                  backgroundColor="$primary6"
                  hoverStyle={{ backgroundColor: '$primary5' }}
                  onPress={handleSaveHfToken}
                  disabled={hfLoading || !hfToken.trim()}
                  icon={hfLoading ? <Spinner size="small" color="#FFFFFF" /> : undefined}
                >
                  <Text fontSize={14} fontWeight="600" color="#FFFFFF">
                    Save Token
                  </Text>
                </Button>
              </XStack>

              <Button
                size="$3"
                chromeless
                onPress={handleOpenHfPage}
                alignSelf="flex-start"
                icon={<ExternalLink size={14} color="$primary8" />}
              >
                <Text fontSize={13} color="$primary8">
                  Get token from HuggingFace
                </Text>
              </Button>
            </>
          ) : (
            <>
              <Text fontSize={13} color="$secondary7" lineHeight={20}>
                Sign in to sync your settings and preferences across devices. We use magic links
                for passwordless authentication.
              </Text>

              {emailSent ? (
                <YStack
                  backgroundColor="hsla(215, 83%, 50%, 0.1)"
                  padding={16}
                  borderRadius={8}
                  alignItems="center"
                  gap={12}
                >
                  <CheckCircle size={32} color="$primary8" />
                  <YStack alignItems="center" gap={4}>
                    <Text fontSize={15} fontWeight="600" color="$secondary11">
                      Check your email
                    </Text>
                    <Text fontSize={13} color="$secondary7" textAlign="center">
                      We sent a magic link to {email}
                    </Text>
                  </YStack>
                  <Button
                    size="$3"
                    chromeless
                    onPress={() => setEmailSent(false)}
                  >
                    <Text fontSize={13} color="$primary8">
                      Use different email
                    </Text>
                  </Button>
                </YStack>
              ) : (
                <>
                  <YStack gap={8}>
                    <Text fontSize={12} fontWeight="500" color="$secondary9">
                      Email Address
                    </Text>
                    <Input
                      value={email}
                      onChangeText={setEmail}
                      placeholder="you@example.com"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      backgroundColor="$secondary3"
                      borderWidth={0}
                      borderRadius={8}
                      paddingHorizontal={12}
                      paddingVertical={12}
                      fontSize={14}
                      color="$secondary11"
                      placeholderTextColor="$secondary5"
                    />
                  </YStack>

                  <Button
                    size="$4"
                    backgroundColor="$primary6"
                    hoverStyle={{ backgroundColor: '$primary5' }}
                    onPress={handleSupabaseSignIn}
                    disabled={supabaseLoading || !email.trim()}
                    icon={supabaseLoading ? <Spinner size="small" color="#FFFFFF" /> : <User size={16} color="#FFFFFF" />}
                  >
                    <Text fontSize={14} fontWeight="600" color="#FFFFFF">
                      Continue with Email
                    </Text>
                  </Button>
                </>
              )}
            </>
          )}
        </YStack>
      </Sheet.Frame>
    </Sheet>
  )
}
