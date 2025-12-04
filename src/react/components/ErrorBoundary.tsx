import { Component, ReactNode } from 'react'
import { YStack, XStack, Text, Button, H2 } from 'tamagui'
import { AlertTriangle, RefreshCw } from '@tamagui/lucide-icons'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <YStack
          flex={1}
          alignItems="center"
          justifyContent="center"
          padding={48}
          backgroundColor="$background"
          gap={24}
        >
          <YStack
            width={80}
            height={80}
            borderRadius={40}
            backgroundColor="hsla(0, 84%, 60%, 0.1)"
            alignItems="center"
            justifyContent="center"
          >
            <AlertTriangle size={40} color="hsl(0, 84%, 60%)" />
          </YStack>

          <YStack alignItems="center" gap={12}>
            <H2 color="$secondary11">Something went wrong</H2>
            <Text
              fontSize={14}
              color="$secondary7"
              textAlign="center"
              maxWidth={400}
            >
              An unexpected error occurred. Please try again or restart the application.
            </Text>
          </YStack>

          {this.state.error && (
            <YStack
              backgroundColor="$secondary2"
              borderRadius={8}
              padding={16}
              maxWidth={500}
              width="100%"
            >
              <Text
                fontSize={12}
                fontFamily="$mono"
                color="hsl(0, 84%, 60%)"
                numberOfLines={3}
              >
                {this.state.error.message}
              </Text>
            </YStack>
          )}

          <XStack gap={12}>
            <Button
              size="$4"
              backgroundColor="$primary6"
              hoverStyle={{ backgroundColor: '$primary5' }}
              onPress={this.handleReset}
              icon={<RefreshCw size={16} color="#FFFFFF" />}
            >
              <Text fontSize={14} fontWeight="600" color="#FFFFFF">
                Try Again
              </Text>
            </Button>
            <Button
              size="$4"
              backgroundColor="$secondary3"
              hoverStyle={{ backgroundColor: '$secondary4' }}
              onPress={() => window.location.reload()}
            >
              <Text fontSize={14} color="$secondary9">
                Reload App
              </Text>
            </Button>
          </XStack>
        </YStack>
      )
    }

    return this.props.children
  }
}
