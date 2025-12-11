import React, { useState, useCallback, lazy, Suspense } from 'react'
import {
  YStack,
  XStack,
  Text,
  Button,
  Separator,
} from '@odd-design-system/ui-components'
import { Popover, Circle, Image } from 'tamagui'
import { User } from '@tamagui/lucide-icons'
import { usePreloadedImage } from '@odd-core/ui/hooks-web-only'

// Lazy load ProfileEditModal
const ProfileEditModal = lazy(() =>
  import('./ProfileEditModal').then((m) => ({ default: m.ProfileEditModal }))
)

export interface UserProfileMenuProps {
  /** User's email address */
  email?: string
  /** User's display name */
  name?: string
  /** User's avatar URL */
  avatarUrl?: string
  /** User's phone number */
  phone?: string
  /** Whether the user is authenticated */
  isAuthenticated?: boolean
  /** Callback when user signs out */
  onSignOut?: () => void
  /** Callback when user wants to sign in */
  onSignIn?: () => void
  /** Callback when profile is updated */
  onProfileUpdate?: (data: { name?: string; avatarUrl?: string; phone?: string }) => Promise<void>
  /** Callback to refresh profile data after save - passes new data for instant update */
  onProfileUpdated?: (data: { name?: string; avatarUrl?: string; phone?: string }) => void
}

/**
 * Get initials from email or name for avatar fallback
 */
function getInitials(email?: string, name?: string): string {
  if (name) {
    const parts = name.trim().split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }
  if (email) {
    // Use first two characters of email before @
    const localPart = email.split('@')[0]
    return localPart.slice(0, 2).toUpperCase()
  }
  return '?'
}

// Primary blue color from VAI theme
const VAI_PRIMARY_BLUE = 'hsl(215, 83%, 50%)'

export function UserProfileMenu({
  email,
  name,
  avatarUrl,
  phone,
  isAuthenticated = false,
  onSignOut,
  onSignIn,
  onProfileUpdate,
  onProfileUpdated,
}: UserProfileMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  // Use odd-core's usePreloadedImage hook for avatar loading
  const { isLoaded: imageLoaded, isError: imageError } = usePreloadedImage(avatarUrl, {
    timeout: 3000,
    checkBrowserCache: true,
  })

  const handleSignOut = useCallback(async () => {
    setIsSigningOut(true)
    try {
      await onSignOut?.()
    } finally {
      setIsSigningOut(false)
      setIsOpen(false)
    }
  }, [onSignOut])

  const handleOpenEditModal = useCallback(() => {
    setIsOpen(false)
    setIsEditModalOpen(true)
  }, [])

  const handleCloseEditModal = useCallback(() => {
    setIsEditModalOpen(false)
  }, [])

  const initials = getInitials(email, name)
  const displayName = name || email?.split('@')[0] || 'User'

  // If not authenticated, show a sign-in button
  if (!isAuthenticated) {
    return (
      <Button
        width="100%"
        backgroundColor="transparent"
        justifyContent="flex-start"
        paddingHorizontal={12}
        paddingVertical={12}
        borderRadius={6}
        hoverStyle={{ backgroundColor: '$color3' }}
        pressStyle={{ backgroundColor: '$color3' }}
        onPress={onSignIn}
        icon={<User size={18} color="$color10" />}
        aria-label="Sign in"
      >
        <Text
          fontSize={15}
          fontWeight="500"
          color="$color"
          fontFamily="$heading"
        >
          Sign In
        </Text>
      </Button>
    )
  }

  return (
    <Popover
      open={isOpen}
      onOpenChange={setIsOpen}
      placement="top"
      allowFlip
    >
      <Popover.Trigger asChild>
        <XStack
          alignItems="center"
          gap={12}
          padding={8}
          marginHorizontal={-8}
          borderRadius={8}
          hoverStyle={{ backgroundColor: '$color3' }}
          pressStyle={{ backgroundColor: '$color4' }}
          cursor="pointer"
          aria-label="Open profile menu"
        >
          {/* Circular avatar with image or initials */}
          <Circle
            size={36}
            backgroundColor={imageLoaded && !imageError ? 'transparent' : VAI_PRIMARY_BLUE}
            alignItems="center"
            justifyContent="center"
            overflow="hidden"
          >
            {/* Show image only when loaded (prevents flash of fallback) */}
            {avatarUrl && imageLoaded && !imageError ? (
              <Image
                source={{ uri: avatarUrl }}
                width={36}
                height={36}
                resizeMode="cover"
              />
            ) : (
              <Text
                fontSize={14}
                fontWeight="600"
                color="white"
                fontFamily="$heading"
              >
                {initials}
              </Text>
            )}
          </Circle>
          <YStack flex={1} gap={2}>
            <Text
              fontSize={14}
              fontWeight="600"
              color="$color"
              fontFamily="$heading"
              numberOfLines={1}
            >
              {displayName}
            </Text>
            {email && (
              <Text
                fontSize={12}
                color="$color9"
                fontFamily="$body"
                numberOfLines={1}
              >
                {email}
              </Text>
            )}
          </YStack>
        </XStack>
      </Popover.Trigger>

      <Popover.Content
        backgroundColor="$color1"
        borderWidth={1}
        borderColor="$color5"
        borderRadius={8}
        padding={12}
        minWidth={220}
        elevate
        animation="quick"
        enterStyle={{ y: 10, opacity: 0 }}
        exitStyle={{ y: 10, opacity: 0 }}
      >
        <Popover.Arrow
          backgroundColor="$color1"
          borderWidth={1}
          borderColor="$color5"
        />

        {/* Profile popup content */}
        <YStack gap={8}>
          {/* Email display */}
          <Text
            fontSize={14}
            color="$color"
            fontFamily="$body"
          >
            {email}
          </Text>

          <Separator marginVertical={4} backgroundColor="$color5" />

          {/* Edit Profile link */}
          <Text
            fontSize={14}
            color="$blue10"
            fontFamily="$body"
            cursor="pointer"
            hoverStyle={{ opacity: 0.8 }}
            pressStyle={{ opacity: 0.6 }}
            onPress={handleOpenEditModal}
          >
            Edit Profile
          </Text>

          {/* Log out link */}
          <Text
            fontSize={14}
            color="$blue10"
            fontFamily="$body"
            cursor="pointer"
            hoverStyle={{ opacity: 0.8 }}
            pressStyle={{ opacity: 0.6 }}
            onPress={handleSignOut}
            disabled={isSigningOut}
          >
            {isSigningOut ? 'Logging out...' : 'Log out'}
          </Text>
        </YStack>
      </Popover.Content>

      {/* Profile Edit Modal */}
      <Suspense fallback={null}>
        {isEditModalOpen && (
          <ProfileEditModal
            open={isEditModalOpen}
            onClose={handleCloseEditModal}
            email={email}
            name={name}
            avatarUrl={avatarUrl}
            phone={phone}
            onSave={onProfileUpdate}
            onProfileUpdated={onProfileUpdated}
          />
        )}
      </Suspense>
    </Popover>
  )
}
