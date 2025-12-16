/**
 * LoginScreen Component
 *
 * Full-page login screen shown after onboarding.
 */

import React, { useState, useCallback } from 'react'
import { YStack, XStack, Text, Button, Input, H1, H2, Spinner } from '@odd-design-system/ui-components'
import { useToastStore } from '../stores/useToastStore'
import { authService } from '../services/auth.service'

interface LoginScreenProps {
  onLoginSuccess: () => void
  onBack?: () => void
}

// Logo illustration
function LogoIllustration() {
  return (
    <YStack alignItems="center" justifyContent="center" marginBottom="$4">
      <img
        src="./app-icon.png"
        alt="VAI Studio"
        style={{ width: 80, height: 80, borderRadius: 16 }}
      />
    </YStack>
  )
}

export function LoginScreen({ onLoginSuccess, onBack }: LoginScreenProps) {
  const { showToast } = useToastStore()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const handleSignIn = useCallback(async () => {
    if (!email.trim() || !email.includes('@')) {
      showToast('Please enter a valid email', 'warning', 2000)
      return
    }

    setIsLoading(true)
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
      setIsLoading(false)
    }
  }, [email, showToast])

  return (
    <YStack
      flex={1}
      backgroundColor="$background"
      alignItems="center"
      justifyContent="center"
      padding="$6"
      position="relative"
    >
      {/* Back Button */}
      {onBack && (
        <XStack
          position="absolute"
          top={60}
          left={0}
          paddingLeft="$4"
          zIndex={10}
        >
          <Button
            size="$3"
            chromeless
            onPress={onBack}
          >
            <Text color="$color11" fontWeight="500" fontSize={16}>← Back</Text>
          </Button>
        </XStack>
      )}

      <YStack
        width="100%"
        maxWidth={400}
        gap="$4"
        alignItems="center"
      >
        <LogoIllustration />

        <YStack alignItems="center" gap="$2" marginBottom="$4">
          <H1 textAlign="center">VAI Studio</H1>
          <H2 textAlign="center">by Odd.Community</H2>
          <Text fontSize={16} color="$color11" textAlign="center">
            Join the community for free access VAI Studio
          </Text>
        </YStack>

        {emailSent ? (
          <YStack
            width="100%"
            backgroundColor="$color3"
            padding="$4"
            borderRadius="$4"
            alignItems="center"
            gap="$3"
          >
            <YStack
              width={48}
              height={48}
              borderRadius={24}
              backgroundColor="$color5"
              alignItems="center"
              justifyContent="center"
            >
              <Text fontSize={24}>✉️</Text>
            </YStack>
            <YStack alignItems="center" gap="$2">
              <Text fontSize={16} fontWeight="600" color="$color">
                Check your email
              </Text>
              <Text fontSize={14} color="$color11" textAlign="center">
                We sent a magic link to {email}
              </Text>
            </YStack>
            <Button
              size="$3"
              chromeless
              onPress={() => setEmailSent(false)}
            >
              <Text fontSize={14} color="$color11">
                Use different email
              </Text>
            </Button>
          </YStack>
        ) : (
          <YStack width="100%" gap="$4">
            <YStack gap="$2">
              <Text fontSize={14} fontWeight="500" color="$color11">
                Email Address
              </Text>
              <Input
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                backgroundColor="$color3"
                borderWidth={1}
                borderColor="$color5"
                borderRadius="$3"
                paddingHorizontal="$3"
                paddingVertical="$3"
                fontSize={16}
                color="$color"
                placeholderTextColor="$color9"
              />
            </YStack>

            <Button
              size="$5"
              backgroundColor="hsl(215, 83%, 50%)"
              hoverStyle={{ backgroundColor: 'hsl(215, 83%, 45%)' }}
              pressStyle={{ backgroundColor: 'hsl(215, 83%, 40%)' }}
              onPress={handleSignIn}
              disabled={isLoading || !email.trim()}
              disabledStyle={{ opacity: 0.5 }}
            >
              {isLoading ? (
                <Spinner size="small" color="#FFFFFF" />
              ) : (
                <Text fontSize={16} fontWeight="600" color="#FFFFFF">
                  Continue with Email
                </Text>
              )}
            </Button>
          </YStack>
        )}


        <Text fontSize={12} color="$color9" textAlign="center" marginTop="$4">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </Text>
      </YStack>
    </YStack>
  )
}

export default LoginScreen
