import React from 'react'
import { YStack, XStack, Text, H1 } from '@odd-design-system/ui-components'
import { CheckCircleIcon } from './Icons'
import { CustomThemeSwitch } from './CustomThemeSwitch'

export interface WelcomeScreenProps {
  version?: string
  releaseDate?: string
}

interface FeatureItemProps {
  text: string
}

function FeatureItem({ text }: FeatureItemProps) {
  return (
    <XStack alignItems="flex-start" gap={12}>
      <YStack marginTop={2}>
        <CheckCircleIcon size={20} color="hsl(180, 70%, 55%)" />
      </YStack>
      <Text fontSize={16} color="$color" lineHeight={24}>
        {text}
      </Text>
    </XStack>
  )
}

export function WelcomeScreen({
  version = 'v3.0.1',
  releaseDate = 'Nov 26, 2025',
}: WelcomeScreenProps) {
  const features = [
    'Test multiple Speech-To-Text models locally',
    'Compare results side-by-side',
    'View processing time and metrics',
    'No cloud required - 100% local',
  ]

  return (
    <YStack
      flex={1}
      alignItems="center"
      justifyContent="center"
      padding={48}
      backgroundColor="$background"
      position="relative"
      $sm={{
        padding: 24,
      }}
    >
      {/* Version Badge - Positioned absolutely in top right */}
      <YStack
        position="absolute"
        top={24}
        right={24}
        alignItems="flex-end"
        $sm={{
          top: 16,
          right: 16,
        }}
      >
        <XStack gap={8} alignItems="center">
          <CustomThemeSwitch />
          <XStack
            backgroundColor="$color3"
            borderRadius={999}
            width={56}
            height={28}
            justifyContent="center"
            alignItems="center"
          >
            <Text
              fontSize={12}
              fontWeight="600"
              color="$color"
              fontFamily="$heading"
            >
              {version}
            </Text>
          </XStack>
        </XStack>
        <Text
          fontSize={10}
          color="$color9"
          marginTop={6}
        >
          {releaseDate}
        </Text>
      </YStack>

      {/* Main Content */}
      <YStack
        width="100%"
        maxWidth={640}
        alignItems="center"
        gap={32}
        $sm={{
          marginTop: 32,
        }}
      >
        {/* Welcome Header */}
        <YStack alignItems="center" gap={8}>
          <H1>
            Welcome to VAI Studio
          </H1>
          <Text
            fontSize={18}
            color="$color"
            textAlign="center"
            $sm={{
              fontSize: 16,
            }}
          >
            Select an audio file and model to begin transcription
          </Text>
        </YStack>

        {/* Features List */}
        <YStack gap={16} alignItems="flex-start">
          {features.map((feature, index) => (
            <FeatureItem key={index} text={feature} />
          ))}
        </YStack>
      </YStack>
    </YStack>
  )
}
