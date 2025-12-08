/**
 * OnboardingScreen Component
 *
 * First-run onboarding flow for new users.
 */

import React, { useState, useCallback } from 'react'
import { YStack, XStack, Text, H2, Button, Paragraph } from '@odd-design-system/ui-components'
import Svg, { Path, Rect, Line, Polyline } from 'react-native-svg'

interface OnboardingScreenProps {
  onComplete: () => void
}

interface OnboardingStep {
  id: string
  title: string
  description: string
  image: React.ReactNode
  content?: React.ReactNode
}

// VAI primary blue color
const VAI_BLUE = 'hsl(215, 83%, 50%)'
const VAI_BLUE_HOVER = 'hsl(215, 83%, 45%)'
const VAI_BLUE_PRESS = 'hsl(215, 83%, 40%)'
const VAI_TEAL_LIGHT = 'hsl(215, 83%, 55%)'
const VAI_TEAL_LIGHTER = 'hsl(215, 83%, 65%)'

// Custom illustration components for each slide
function WelcomeIllustration() {
  return (
    <YStack alignItems="center" justifyContent="center" padding="$4">
      <img
        src="./app-icon.png"
        alt="VAI Studio"
        style={{ width: 120, height: 120, borderRadius: 24 }}
      />
    </YStack>
  )
}

function AudioFileIllustration() {
  return (
    <YStack alignItems="center" justifyContent="center" padding="$4">
      <Svg width={120} height={120} viewBox="0 0 24 24" fill="none">
        <Path
          d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
          stroke={VAI_TEAL_LIGHT}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Polyline
          points="14,2 14,8 20,8"
          stroke={VAI_TEAL_LIGHT}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Rect x="7" y="12" width="1.5" height="4" rx={0.5} fill={VAI_TEAL_LIGHTER} />
        <Rect x="10" y="10" width="1.5" height="8" rx={0.5} fill={VAI_TEAL_LIGHT} />
        <Rect x="13" y="11" width="1.5" height="6" rx={0.5} fill={VAI_TEAL_LIGHTER} />
        <Rect x="16" y="13" width="1.5" height="2" rx={0.5} fill={VAI_TEAL_LIGHT} />
      </Svg>
    </YStack>
  )
}

function ModelsIllustration() {
  return (
    <YStack alignItems="center" justifyContent="center" padding="$4">
      <Svg width={120} height={120} viewBox="0 0 24 24" fill="none">
        <Rect x="2" y="3" width="8" height="8" rx={2} stroke={VAI_TEAL_LIGHT} strokeWidth={1.5} fill="none" />
        <Rect x="14" y="3" width="8" height="8" rx={2} stroke={VAI_TEAL_LIGHTER} strokeWidth={1.5} fill="none" />
        <Rect x="8" y="13" width="8" height="8" rx={2} stroke={VAI_TEAL_LIGHT} strokeWidth={1.5} fill="none" />
        <Polyline points="4,7 5.5,8.5 8,5.5" stroke={VAI_TEAL_LIGHT} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        <Polyline points="16,7 17.5,8.5 20,5.5" stroke={VAI_TEAL_LIGHTER} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        <Polyline points="10,17 11.5,18.5 14,15.5" stroke={VAI_TEAL_LIGHT} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </YStack>
  )
}

function CompareIllustration() {
  return (
    <YStack alignItems="center" justifyContent="center" padding="$4">
      <Svg width={120} height={120} viewBox="0 0 24 24" fill="none">
        <Rect x="2" y="4" width="8" height="16" rx={2} stroke={VAI_TEAL_LIGHT} strokeWidth={1.5} fill="none" />
        <Rect x="14" y="4" width="8" height="16" rx={2} stroke={VAI_TEAL_LIGHTER} strokeWidth={1.5} fill="none" />
        <Line x1="4" y1="8" x2="8" y2="8" stroke={VAI_TEAL_LIGHT} strokeWidth={1} strokeLinecap="round" />
        <Line x1="4" y1="11" x2="8" y2="11" stroke={VAI_TEAL_LIGHT} strokeWidth={1} strokeLinecap="round" />
        <Line x1="4" y1="14" x2="7" y2="14" stroke={VAI_TEAL_LIGHT} strokeWidth={1} strokeLinecap="round" />
        <Line x1="16" y1="8" x2="20" y2="8" stroke={VAI_TEAL_LIGHTER} strokeWidth={1} strokeLinecap="round" />
        <Line x1="16" y1="11" x2="20" y2="11" stroke={VAI_TEAL_LIGHTER} strokeWidth={1} strokeLinecap="round" />
        <Line x1="16" y1="14" x2="19" y2="14" stroke={VAI_TEAL_LIGHTER} strokeWidth={1} strokeLinecap="round" />
        <Line x1="10.5" y1="12" x2="13.5" y2="12" stroke={VAI_TEAL_LIGHT} strokeWidth={1.5} strokeLinecap="round" />
        <Polyline points="12.5,10.5 13.5,12 12.5,13.5" stroke={VAI_TEAL_LIGHT} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </YStack>
  )
}

function PrivacyIllustration() {
  return (
    <YStack alignItems="center" justifyContent="center" padding="$4">
      <Svg width={120} height={120} viewBox="0 0 24 24" fill="none">
        <Path
          d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
          stroke={VAI_TEAL_LIGHT}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Polyline
          points="9,12 11,14 15,10"
          stroke={VAI_TEAL_LIGHTER}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </YStack>
  )
}

// Feature list component for slides
function FeatureList({ features }: { features: string[] }) {
  return (
    <YStack gap="$2" paddingHorizontal="$4" marginTop="$4">
      {features.map((feature, index) => (
        <XStack key={index} gap="$2" alignItems="center">
          <YStack
            width={6}
            height={6}
            borderRadius={3}
            backgroundColor={VAI_TEAL_LIGHT}
          />
          <Text fontSize={14} color="$color11">
            {feature}
          </Text>
        </XStack>
      ))}
    </YStack>
  )
}

// Onboarding slide component
function OnboardingSlide({ step }: { step: OnboardingStep }) {
  return (
    <YStack flex={1} alignItems="center" justifyContent="center" padding="$6">
      {step.image}
      <YStack alignItems="center" gap="$2" marginTop="$4">
        <H2 textAlign="center">{step.title}</H2>
        <Paragraph
          fontSize={16}
          color="$color11"
          textAlign="center"
          maxWidth={400}
          whiteSpace="pre-line"
        >
          {step.description}
        </Paragraph>
      </YStack>
      {step.content}
    </YStack>
  )
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to VAI Studio',
      description: 'Your local Speech-to-Text | Voice AI\nTesting & Comparison tool.\nNo Cloud Required. 100% Private.',
      image: <WelcomeIllustration />,
    },
    {
      id: 'audio',
      title: 'Select Audio Files',
      description: 'Import audio files or record directly.\nSupports MP3, WAV, M4A, and more.',
      image: <AudioFileIllustration />,
      content: (
        <FeatureList
          features={[
            'Drag and drop audio files',
            'Record with your microphone',
            'Batch process multiple files',
          ]}
        />
      ),
    },
    {
      id: 'models',
      title: 'Choose Your Models',
      description: 'Select from a variety of speech recognition models \nfrom OpenAI, NVIDIA, Meta, and more.',
      image: <ModelsIllustration />,
      content: (
        <FeatureList
          features={[
            'OpenAI Whisper models',
            'NVIDIA Parakeet models',
            'Meta Wav2Vec models',
            'IBM Granite Speech',
          ]}
        />
      ),
    },
    {
      id: 'compare',
      title: 'Compare Results',
      description: 'Run the same audio through multiple models and compare transcription quality side-by-side.',
      image: <CompareIllustration />,
      content: (
        <FeatureList
          features={[
            'Side-by-side comparison',
            'Processing time metrics',
            'Export to TXT, SRT, VTT, PDF',
          ]}
        />
      ),
    },
    {
      id: 'privacy',
      title: '100% Local & Private',
      description: 'All processing happens on your machine.\nYour audio never leaves your computer.',
      image: <PrivacyIllustration />,
    },
  ]

  const currentStep = steps[currentIndex]
  const isLastStep = currentIndex === steps.length - 1

  const handleNext = useCallback(() => {
    if (isLastStep) {
      onComplete()
    } else {
      setCurrentIndex(prev => prev + 1)
    }
  }, [isLastStep, onComplete])

  const handlePrevious = useCallback(() => {
    setCurrentIndex(prev => Math.max(prev - 1, 0))
  }, [])

  const handleSkip = useCallback(() => {
    onComplete()
  }, [onComplete])

  const handleDotPress = useCallback((index: number) => {
    setCurrentIndex(index)
  }, [])

  return (
    <YStack flex={1} backgroundColor="$background">
      {/* Skip Button */}
      <XStack
        position="absolute"
        top={0}
        right={0}
        padding="$4"
        zIndex={10}
      >
        <Button
          size="$3"
          chromeless
          onPress={handleSkip}
        >
          <Text color="$color9">Skip</Text>
        </Button>
      </XStack>

      {/* Slide Content */}
      <YStack flex={1}>
        <OnboardingSlide step={currentStep} />
      </YStack>

      {/* Bottom Controls */}
      <YStack padding="$4" paddingBottom="$6" gap="$4">
        {/* Progress Indicators */}
        <XStack justifyContent="center" gap="$2">
          {steps.map((_, index) => (
            <YStack
              key={index}
              width={index === currentIndex ? 24 : 8}
              height={8}
              borderRadius={4}
              backgroundColor={index === currentIndex ? VAI_BLUE : '$color5'}
              opacity={index === currentIndex ? 1 : 0.5}
              pressStyle={{ opacity: 0.7 }}
              onPress={() => handleDotPress(index)}
              animation="quick"
            />
          ))}
        </XStack>

        {/* Navigation Buttons */}
        <XStack gap="$3">
          {/* Back Button (not on first step) */}
          {currentIndex > 0 && (
            <Button
              flex={1}
              size="$4"
              backgroundColor="$color3"
              borderWidth={1}
              borderColor="$color6"
              hoverStyle={{ backgroundColor: '$color4' }}
              onPress={handlePrevious}
            >
              <Text fontSize={16} color="$color11">Back</Text>
            </Button>
          )}

          {/* Next/Complete Button - VAI Blue */}
          <Button
            flex={currentIndex > 0 ? 2 : 1}
            size="$4"
            backgroundColor={VAI_BLUE}
            hoverStyle={{ backgroundColor: VAI_BLUE_HOVER }}
            pressStyle={{ backgroundColor: VAI_BLUE_PRESS }}
            onPress={handleNext}
          >
            <Text fontSize={16} fontWeight="600" color="#FFFFFF">
              {isLastStep ? 'Get Started' : 'Next'}
            </Text>
          </Button>
        </XStack>
      </YStack>
    </YStack>
  )
}

export default OnboardingScreen
