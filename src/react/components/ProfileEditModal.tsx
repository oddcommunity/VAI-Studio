import { useState, useCallback, useEffect } from 'react'
import {
  YStack,
  XStack,
  Text,
  Button,
  Dialog,
  Input,
  ScrollView,
} from '@odd-design-system/ui-components'
import { X, User, Camera, Save, Phone } from '@tamagui/lucide-icons'
import { Circle, Image } from 'tamagui'
import { Z_INDEX } from '../constants/zIndex'
import { electronBridge } from '../services/electron.bridge'
import { useToastStore } from '../stores/useToastStore'

// Primary blue color from VAI theme
const VAI_PRIMARY_BLUE = 'hsl(215, 83%, 50%)'

interface ProfileEditModalProps {
  open: boolean
  onClose: () => void
  /** Current user email */
  email?: string
  /** Current display name */
  name?: string
  /** Current avatar URL */
  avatarUrl?: string
  /** Current phone number */
  phone?: string
  /** Callback when profile is saved (called after Supabase update) */
  onSave?: (data: { name?: string; avatarUrl?: string; phone?: string }) => Promise<void>
  /** Callback to refresh profile state in parent after save - passes new data for instant update */
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
    const localPart = email.split('@')[0]
    return localPart.slice(0, 2).toUpperCase()
  }
  return '?'
}

export function ProfileEditModal({
  open,
  onClose,
  email,
  name: initialName,
  avatarUrl: initialAvatarUrl,
  phone: initialPhone,
  onSave,
  onProfileUpdated,
}: ProfileEditModalProps) {
  const { showToast } = useToastStore()

  // Local state for editing
  const [displayName, setDisplayName] = useState(initialName || '')
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl || '')
  const [phone, setPhone] = useState(initialPhone || '')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [pendingAvatarFile, setPendingAvatarFile] = useState<{ path: string; mimeType: string } | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isSelectingImage, setIsSelectingImage] = useState(false)

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setDisplayName(initialName || '')
      setAvatarUrl(initialAvatarUrl || '')
      setPhone(initialPhone || '')
      setAvatarPreview(null)
      setPendingAvatarFile(null)
    }
  }, [open, initialName, initialAvatarUrl, initialPhone])

  const initials = getInitials(email, displayName || initialName)

  // Handle avatar image selection using Electron dialog
  const handleSelectAvatar = useCallback(async () => {
    if (!electronBridge.isElectron()) {
      showToast('Image selection only available in desktop app', 'warning', 3000)
      return
    }

    setIsSelectingImage(true)
    try {
      // Use Electron's dialog to select an image file
      const result = await electronBridge.selectImageFile()

      if (result?.success && result.filePath) {
        // Create a file:// URL for preview
        setAvatarPreview(`file://${result.filePath}`)

        // Determine mime type from extension
        const ext = result.filePath.split('.').pop()?.toLowerCase() || ''
        const mimeMap: Record<string, string> = {
          jpg: 'image/jpeg',
          jpeg: 'image/jpeg',
          png: 'image/png',
          gif: 'image/gif',
          webp: 'image/webp'
        }
        const mimeType = mimeMap[ext] || 'image/jpeg'

        // Store the file path and mime type for upload on save
        setPendingAvatarFile({ path: result.filePath, mimeType })
        showToast('Image selected', 'success', 2000)
      }
    } catch (error) {
      console.error('[ProfileEditModal] Failed to select image:', error)
      showToast('Failed to select image', 'error', 3000)
    } finally {
      setIsSelectingImage(false)
    }
  }, [showToast])

  // Handle save - uploads avatar to Supabase storage and updates profile
  const handleSave = useCallback(async () => {
    if (!electronBridge.isElectron()) {
      showToast('Profile editing only available in desktop app', 'warning', 3000)
      return
    }

    setIsSaving(true)
    try {
      let uploadedAvatarUrl: string | undefined

      // If there's a pending avatar file, upload it first
      if (pendingAvatarFile) {
        console.log('[ProfileEditModal] Uploading avatar...', pendingAvatarFile)

        // Read the file and convert to base64 using fetch API
        const response = await fetch(`file://${pendingAvatarFile.path}`)
        const blob = await response.blob()
        const arrayBuffer = await blob.arrayBuffer()
        const base64 = btoa(
          new Uint8Array(arrayBuffer).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            ''
          )
        )

        // Upload to Supabase via IPC
        const uploadResult = await electronBridge.auth.uploadAvatar({
          imageData: base64,
          mimeType: pendingAvatarFile.mimeType
        })

        if (!uploadResult.success) {
          throw new Error(uploadResult.error || 'Failed to upload avatar')
        }

        uploadedAvatarUrl = uploadResult.avatarUrl
        console.log('[ProfileEditModal] Avatar uploaded:', uploadedAvatarUrl)
      }

      // Update profile (name, avatar, phone) via Supabase auth.updateUser
      const updateResult = await electronBridge.auth.updateProfile({
        displayName: displayName || undefined,
        avatarUrl: uploadedAvatarUrl, // Will be set from upload, or undefined
        phone: phone || undefined
      })

      if (!updateResult.success) {
        throw new Error(updateResult.error || 'Failed to update profile')
      }

      // Call the legacy onSave callback if provided (for backwards compatibility)
      if (onSave) {
        await onSave({
          name: displayName || undefined,
          avatarUrl: uploadedAvatarUrl || undefined,
          phone: phone || undefined
        })
      }

      // Notify parent with new data for instant UI update
      onProfileUpdated?.({
        name: displayName || undefined,
        avatarUrl: uploadedAvatarUrl || avatarUrl || undefined,
        phone: phone || undefined
      })

      showToast('Profile updated', 'success', 2000)
      onClose()
    } catch (error) {
      console.error('[ProfileEditModal] Failed to save profile:', error)
      showToast(error instanceof Error ? error.message : 'Failed to update profile', 'error', 3000)
    } finally {
      setIsSaving(false)
    }
  }, [displayName, phone, avatarUrl, pendingAvatarFile, onSave, onProfileUpdated, onClose, showToast])

  // Determine which avatar to display
  const displayAvatarUrl = avatarPreview || avatarUrl || initialAvatarUrl

  return (
    <Dialog
      modal
      open={open}
      onOpenChange={(isOpen: boolean) => !isOpen && onClose()}
    >
      <Dialog.Portal>
        <Dialog.Overlay
          key="overlay"
          animation="quick"
          opacity={0.75}
          enterStyle={{ opacity: 0 }}
          exitStyle={{ opacity: 0 }}
          backgroundColor="rgba(0,0,0,0.75)"
          zIndex={Z_INDEX.MODAL}
        />
        <Dialog.Content
          key="content"
          bordered
          elevate
          animation={[
            'quick',
            {
              opacity: {
                overshootClamping: true,
              },
            },
          ]}
          enterStyle={{ x: 0, y: -20, opacity: 0, scale: 0.95 }}
          exitStyle={{ x: 0, y: 10, opacity: 0, scale: 0.95 }}
          backgroundColor="$secondary1"
          borderRadius={16}
          padding={0}
          width="90%"
          maxWidth={480}
          maxHeight="85vh"
          zIndex={Z_INDEX.MODAL + 1}
        >
          {/* Header */}
          <XStack
            padding={20}
            borderBottomWidth={1}
            borderBottomColor="$secondary3"
            alignItems="center"
            justifyContent="space-between"
          >
            <XStack alignItems="center" gap={12}>
              <User size={24} color="$secondary9" />
              <Text fontSize={18} fontWeight="600" color="$secondary11">
                Edit Profile
              </Text>
            </XStack>
            <Dialog.Close asChild>
              <Button
                size="$3"
                circular
                chromeless
                onPress={onClose}
                hoverStyle={{ backgroundColor: '$secondary3' }}
              >
                <X size={20} color="$secondary7" />
              </Button>
            </Dialog.Close>
          </XStack>

          {/* Content */}
          <ScrollView maxHeight="calc(85vh - 160px)" showsVerticalScrollIndicator>
            <YStack padding={24} gap={24}>
              {/* Avatar Section */}
              <YStack alignItems="center" gap={16}>
                <YStack position="relative">
                  {/* Avatar Circle */}
                  <Circle
                    size={96}
                    backgroundColor={displayAvatarUrl ? 'transparent' : VAI_PRIMARY_BLUE}
                    alignItems="center"
                    justifyContent="center"
                    overflow="hidden"
                  >
                    {displayAvatarUrl ? (
                      <Image
                        source={{ uri: displayAvatarUrl }}
                        width={96}
                        height={96}
                        resizeMode="cover"
                      />
                    ) : (
                      <Text
                        fontSize={32}
                        fontWeight="600"
                        color="white"
                        fontFamily="$heading"
                      >
                        {initials}
                      </Text>
                    )}
                  </Circle>

                  {/* Camera Button Overlay */}
                  <Circle
                    size={32}
                    backgroundColor="$secondary1"
                    position="absolute"
                    bottom={0}
                    right={0}
                    borderWidth={2}
                    borderColor="$secondary3"
                    alignItems="center"
                    justifyContent="center"
                    cursor="pointer"
                    hoverStyle={{ backgroundColor: '$secondary2' }}
                    pressStyle={{ scale: 0.95 }}
                    onPress={handleSelectAvatar}
                    disabled={isSelectingImage}
                  >
                    <Camera size={16} color="$secondary9" />
                  </Circle>
                </YStack>

                <Button
                  size="$3"
                  chromeless
                  onPress={handleSelectAvatar}
                  disabled={isSelectingImage}
                  hoverStyle={{ backgroundColor: '$secondary3' }}
                >
                  <Text fontSize={14} color="$primary8">
                    {isSelectingImage ? 'Selecting...' : 'Change Photo'}
                  </Text>
                </Button>
              </YStack>

              {/* Form Fields */}
              <YStack gap={20}>
                {/* Display Name */}
                <YStack gap={8}>
                  <Text
                    fontSize={13}
                    fontWeight="500"
                    color="$secondary9"
                    fontFamily="$body"
                  >
                    Display Name
                  </Text>
                  <Input
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholder="Enter your name"
                    backgroundColor="$secondary2"
                    borderColor="$secondary4"
                    borderRadius={8}
                    paddingHorizontal={14}
                    paddingVertical={12}
                    fontSize={15}
                  />
                </YStack>

                {/* Email (Read-only) */}
                <YStack gap={8}>
                  <Text
                    fontSize={13}
                    fontWeight="500"
                    color="$secondary9"
                    fontFamily="$body"
                  >
                    Email
                  </Text>
                  <Input
                    value={email || ''}
                    editable={false}
                    backgroundColor="$secondary3"
                    borderColor="$secondary4"
                    borderRadius={8}
                    paddingHorizontal={14}
                    paddingVertical={12}
                    fontSize={15}
                    color="$secondary7"
                  />
                  <Text fontSize={12} color="$secondary6" fontFamily="$body">
                    Email cannot be changed here. Contact support if needed.
                  </Text>
                </YStack>

                {/* Phone Number */}
                <YStack gap={8}>
                  <Text
                    fontSize={13}
                    fontWeight="500"
                    color="$secondary9"
                    fontFamily="$body"
                  >
                    Phone Number
                  </Text>
                  <Input
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="+1 (555) 123-4567"
                    backgroundColor="$secondary2"
                    borderColor="$secondary4"
                    borderRadius={8}
                    paddingHorizontal={14}
                    paddingVertical={12}
                    fontSize={15}
                    keyboardType="phone-pad"
                    autoComplete="tel"
                  />
                  <Text fontSize={12} color="$secondary6" fontFamily="$body">
                    Optional. Used for account recovery and notifications.
                  </Text>
                </YStack>
              </YStack>
            </YStack>
          </ScrollView>

          {/* Footer */}
          <XStack
            padding={20}
            borderTopWidth={1}
            borderTopColor="$secondary3"
            gap={12}
            justifyContent="flex-end"
          >
            <Button
              size="$4"
              backgroundColor="$secondary3"
              hoverStyle={{ backgroundColor: '$secondary4' }}
              onPress={onClose}
            >
              <Text fontSize={14} color="$secondary9">
                Cancel
              </Text>
            </Button>
            <Button
              size="$4"
              backgroundColor="$primary6"
              hoverStyle={{ backgroundColor: '$primary5' }}
              onPress={handleSave}
              disabled={isSaving}
              disabledStyle={{ opacity: 0.6 }}
              icon={<Save size={16} color="#FFFFFF" />}
            >
              <Text fontSize={14} fontWeight="600" color="#FFFFFF">
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Text>
            </Button>
          </XStack>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}
