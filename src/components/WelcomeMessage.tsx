import { YStack, XStack, Text, H1, H2, Card, Button } from '@odd-design-system/ui-components'
import { ColorBlue500 } from '@odd-design-system/design-tokens'

export function WelcomeMessage() {
  return (
    <YStack gap="$5" padding="$8" flex={1} justifyContent="center" alignItems="center">
      <YStack gap="$3" maxWidth={600} alignItems="center">
        <H1 color="$white" textAlign="center">
          Welcome to VAI Studio
        </H1>
        <Text fontSize={16} color="$gray7" textAlign="center" lineHeight={24}>
          A powerful tool for testing and comparing speech-to-text models locally
        </Text>
      </YStack>

      <YStack gap="$3" maxWidth={600} alignSelf="flex-start" marginTop="$6">
        <H2 color="$white">
          Features:
        </H2>

        <YStack gap="$3">
          <XStack gap="$3" alignItems="flex-start">
            <Text fontSize={18} color={ColorBlue500}>
              •
            </Text>
            <YStack flex={1}>
              <Text fontSize={15} color="$gray9" lineHeight={22}>
                <Text fontWeight="600" color="$white">Multiple Backend Support:</Text> Test with Whisper, Voxtral, and other STT engines
              </Text>
            </YStack>
          </XStack>

          <XStack gap="$3" alignItems="flex-start">
            <Text fontSize={18} color={ColorBlue500}>
              •
            </Text>
            <YStack flex={1}>
              <Text fontSize={15} color="$gray9" lineHeight={22}>
                <Text fontWeight="600" color="$white">Model Comparison:</Text> Run transcriptions with multiple models side-by-side
              </Text>
            </YStack>
          </XStack>

          <XStack gap="$3" alignItems="flex-start">
            <Text fontSize={18} color={ColorBlue500}>
              •
            </Text>
            <YStack flex={1}>
              <Text fontSize={15} color="$gray9" lineHeight={22}>
                <Text fontWeight="600" color="$white">Audio Recording:</Text> Record audio directly in the app or import existing files
              </Text>
            </YStack>
          </XStack>

          <XStack gap="$3" alignItems="flex-start">
            <Text fontSize={18} color={ColorBlue500}>
              •
            </Text>
            <YStack flex={1}>
              <Text fontSize={15} color="$gray9" lineHeight={22}>
                <Text fontWeight="600" color="$white">Performance Metrics:</Text> Track processing time and accuracy for each model
              </Text>
            </YStack>
          </XStack>

          <XStack gap="$3" alignItems="flex-start">
            <Text fontSize={18} color={ColorBlue500}>
              •
            </Text>
            <YStack flex={1}>
              <Text fontSize={15} color="$gray9" lineHeight={22}>
                <Text fontWeight="600" color="$white">100% Local:</Text> All processing happens on your machine - no cloud required
              </Text>
            </YStack>
          </XStack>
        </YStack>
      </YStack>

      <YStack marginTop="$6" alignItems="center">
        <Text fontSize={14} color="$gray6" textAlign="center">
          Get started by selecting an audio file and choosing a model
        </Text>
      </YStack>
    </YStack>
  )
}
