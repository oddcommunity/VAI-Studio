import { useState, useCallback, useEffect } from 'react'
import {
  YStack,
  XStack,
  Text,
  Button,
  Dialog,
  Progress,
  ScrollView,
  Tabs,
  styled,
} from '@odd-design-system/ui-components'
import {
  X,
  FolderOpen,
  Download,
  CheckCircle,
  HardDrive,
  Cpu,
  RefreshCw,
} from '@tamagui/lucide-icons'
import { useAppStore } from '../stores/useAppStore'
import { useToastStore } from '../stores/useToastStore'
import { modelService } from '../services/model.service'
import { Z_INDEX } from '../constants/zIndex'
import type { Model } from '../types'

const ModelCard = styled(YStack, {
  backgroundColor: '$secondary3',
  borderRadius: 8,
  padding: 16,
  gap: 12,
})

const Badge = styled(XStack, {
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 4,
  alignItems: 'center',
  gap: 4,
  variants: {
    variant: {
      installed: {
        backgroundColor: 'hsla(142, 76%, 36%, 0.15)',
      },
      available: {
        backgroundColor: '$secondary4',
      },
      downloading: {
        backgroundColor: 'hsla(215, 83%, 50%, 0.15)',
      },
    },
  } as const,
})

interface ModelManagerModalProps {
  open: boolean
  onClose: () => void
}

interface DownloadState {
  modelName: string
  backend: string
  progress: number
  message: string
}

export function ModelManagerModal({ open, onClose }: ModelManagerModalProps) {
  const { backends, setBackends } = useAppStore()
  const { showToast } = useToastStore()
  const [activeTab, setActiveTab] = useState('installed')
  const [downloads, setDownloads] = useState<Record<string, DownloadState>>({})
  const [loading, setLoading] = useState(false)

  // Load backends when modal opens
  useEffect(() => {
    if (open) {
      loadBackends()
    }
  }, [open])

  const loadBackends = useCallback(async () => {
    setLoading(true)
    try {
      const backendsData = await modelService.listBackends()
      setBackends(backendsData)
    } catch (error) {
      showToast('Failed to load backends', 'error', 3000)
    } finally {
      setLoading(false)
    }
  }, [setBackends, showToast])

  const handleDownloadModel = useCallback(
    async (backend: string, modelName: string) => {
      const downloadKey = `${backend}-${modelName}`

      setDownloads((prev) => ({
        ...prev,
        [downloadKey]: {
          modelName,
          backend,
          progress: 0,
          message: 'Starting download...',
        },
      }))

      try {
        await modelService.downloadModel(backend, modelName, (progress, message) => {
          setDownloads((prev) => {
            const existing = prev[downloadKey]
            if (!existing) return prev
            return {
              ...prev,
              [downloadKey]: {
                ...existing,
                progress,
                message,
              },
            }
          })
        })

        setDownloads((prev) => {
          const { [downloadKey]: _, ...rest } = prev
          return rest
        })

        showToast(`${modelName} downloaded successfully`, 'success', 3000)
        loadBackends() // Refresh the list
      } catch (error) {
        setDownloads((prev) => {
          const { [downloadKey]: _, ...rest } = prev
          return rest
        })
        showToast(
          `Failed to download ${modelName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'error',
          5000
        )
      }
    },
    [showToast, loadBackends]
  )

  const getInstalledModels = useCallback(() => {
    const installed: Array<{ backend: string; model: Model }> = []
    Object.entries(backends).forEach(([backendName, backend]) => {
      backend.models.forEach((model) => {
        if (model.installed) {
          installed.push({ backend: backendName, model })
        }
      })
    })
    return installed
  }, [backends])

  const getAvailableModels = useCallback(() => {
    const available: Array<{ backend: string; model: Model }> = []
    Object.entries(backends).forEach(([backendName, backend]) => {
      if (backend.available) {
        backend.models.forEach((model) => {
          if (!model.installed) {
            available.push({ backend: backendName, model })
          }
        })
      }
    })
    return available
  }, [backends])

  const installedModels = getInstalledModels()
  const availableModels = getAvailableModels()

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
          maxWidth={700}
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
              <FolderOpen size={24} color="$secondary9" />
              <Text fontSize={18} fontWeight="600" color="$secondary11">
                Model Manager
              </Text>
            </XStack>
            <XStack gap={8}>
              <Button
                size="$3"
                chromeless
                onPress={loadBackends}
                disabled={loading}
                hoverStyle={{ backgroundColor: '$secondary3' }}
                icon={<RefreshCw size={16} color="$secondary7" />}
              />
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
          </XStack>

          {/* Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            orientation="horizontal"
            flexDirection="column"
            flex={1}
          >
            <Tabs.List
              paddingHorizontal={20}
              paddingTop={12}
              borderBottomWidth={1}
              borderBottomColor="$secondary3"
            >
              <Tabs.Tab
                value="installed"
                backgroundColor={activeTab === 'installed' ? '$secondary3' : 'transparent'}
                borderRadius={6}
                paddingHorizontal={16}
                paddingVertical={8}
              >
                <Text
                  fontSize={14}
                  fontWeight="500"
                  color={activeTab === 'installed' ? '$secondary11' : '$secondary7'}
                >
                  Installed ({installedModels.length})
                </Text>
              </Tabs.Tab>
              <Tabs.Tab
                value="available"
                backgroundColor={activeTab === 'available' ? '$secondary3' : 'transparent'}
                borderRadius={6}
                paddingHorizontal={16}
                paddingVertical={8}
              >
                <Text
                  fontSize={14}
                  fontWeight="500"
                  color={activeTab === 'available' ? '$secondary11' : '$secondary7'}
                >
                  Available ({availableModels.length})
                </Text>
              </Tabs.Tab>
              {Object.keys(downloads).length > 0 && (
                <Tabs.Tab
                  value="downloads"
                  backgroundColor={activeTab === 'downloads' ? '$secondary3' : 'transparent'}
                  borderRadius={6}
                  paddingHorizontal={16}
                  paddingVertical={8}
                >
                  <Text
                    fontSize={14}
                    fontWeight="500"
                    color={activeTab === 'downloads' ? '$primary8' : '$primary6'}
                  >
                    Downloads ({Object.keys(downloads).length})
                  </Text>
                </Tabs.Tab>
              )}
            </Tabs.List>

            <ScrollView maxHeight="calc(85vh - 160px)" showsVerticalScrollIndicator>
              <Tabs.Content value="installed">
                <YStack padding={20}>
                  {installedModels.length === 0 ? (
                    <YStack alignItems="center" justifyContent="center" padding={48} gap={16}>
                      <HardDrive size={48} color="$secondary5" />
                      <Text fontSize={16} color="$secondary7" textAlign="center">
                        No models installed yet
                      </Text>
                      <Button
                        size="$3"
                        chromeless
                        onPress={() => setActiveTab('available')}
                        hoverStyle={{ backgroundColor: '$secondary3' }}
                      >
                        <Text fontSize={14} color="$primary8">
                          Browse available models
                        </Text>
                      </Button>
                    </YStack>
                  ) : (
                    <YStack gap={12}>
                      {installedModels.map(({ backend, model }) => (
                        <ModelCard key={`${backend}-${model.name}`}>
                          <XStack alignItems="flex-start" justifyContent="space-between">
                            <YStack gap={4} flex={1}>
                              <Text fontSize={15} fontWeight="600" color="$secondary11">
                                {model.name}
                              </Text>
                              <Text fontSize={12} color="$secondary6">
                                {backend}
                              </Text>
                            </YStack>
                            <Badge variant="installed">
                              <CheckCircle size={12} color="hsl(142, 76%, 36%)" />
                              <Text fontSize={11} color="hsl(142, 76%, 36%)">
                                Installed
                              </Text>
                            </Badge>
                          </XStack>

                          <XStack gap={16} flexWrap="wrap">
                            <XStack gap={4} alignItems="center">
                              <HardDrive size={12} color="$secondary6" />
                              <Text fontSize={12} color="$secondary7">
                                {model.size}
                              </Text>
                            </XStack>
                            {model.params && (
                              <XStack gap={4} alignItems="center">
                                <Cpu size={12} color="$secondary6" />
                                <Text fontSize={12} color="$secondary7">
                                  {model.params}
                                </Text>
                              </XStack>
                            )}
                            {model.wer && (
                              <Text fontSize={12} color="$secondary7">
                                WER: {model.wer}
                              </Text>
                            )}
                          </XStack>
                        </ModelCard>
                      ))}
                    </YStack>
                  )}
                </YStack>
              </Tabs.Content>

              <Tabs.Content value="available">
                <YStack padding={20}>
                  {availableModels.length === 0 ? (
                    <YStack alignItems="center" justifyContent="center" padding={48} gap={16}>
                      <CheckCircle size={48} color="hsl(142, 76%, 36%)" />
                      <Text fontSize={16} color="$secondary7" textAlign="center">
                        All available models are installed!
                      </Text>
                    </YStack>
                  ) : (
                    <YStack gap={12}>
                      {availableModels.map(({ backend, model }) => {
                        const downloadKey = `${backend}-${model.name}`
                        const isDownloading = !!downloads[downloadKey]

                        return (
                          <ModelCard key={downloadKey}>
                            <XStack alignItems="flex-start" justifyContent="space-between">
                              <YStack gap={4} flex={1}>
                                <Text fontSize={15} fontWeight="600" color="$secondary11">
                                  {model.name}
                                </Text>
                                <Text fontSize={12} color="$secondary6">
                                  {backend}
                                </Text>
                              </YStack>
                              {!isDownloading && (
                                <Button
                                  size="$3"
                                  backgroundColor="$primary6"
                                  hoverStyle={{ backgroundColor: '$primary5' }}
                                  onPress={() => handleDownloadModel(backend, model.name)}
                                  icon={<Download size={14} color="#FFFFFF" />}
                                >
                                  <Text fontSize={12} fontWeight="500" color="#FFFFFF">
                                    Download
                                  </Text>
                                </Button>
                              )}
                            </XStack>

                            <XStack gap={16} flexWrap="wrap">
                              <XStack gap={4} alignItems="center">
                                <HardDrive size={12} color="$secondary6" />
                                <Text fontSize={12} color="$secondary7">
                                  {model.size}
                                </Text>
                              </XStack>
                              {model.params && (
                                <XStack gap={4} alignItems="center">
                                  <Cpu size={12} color="$secondary6" />
                                  <Text fontSize={12} color="$secondary7">
                                    {model.params}
                                  </Text>
                                </XStack>
                              )}
                              {model.wer && (
                                <Text fontSize={12} color="$secondary7">
                                  WER: {model.wer}
                                </Text>
                              )}
                            </XStack>

                            {isDownloading && downloads[downloadKey] && (
                              <YStack gap={8}>
                                <Progress
                                  value={downloads[downloadKey].progress}
                                  max={100}
                                  backgroundColor="$secondary4"
                                >
                                  <Progress.Indicator backgroundColor="$primary6" />
                                </Progress>
                                <Text fontSize={11} color="$secondary6">
                                  {downloads[downloadKey].message}
                                </Text>
                              </YStack>
                            )}
                          </ModelCard>
                        )
                      })}
                    </YStack>
                  )}
                </YStack>
              </Tabs.Content>

              <Tabs.Content value="downloads">
                <YStack padding={20}>
                  {Object.keys(downloads).length === 0 ? (
                    <YStack alignItems="center" justifyContent="center" padding={48} gap={16}>
                      <Download size={48} color="$secondary5" />
                      <Text fontSize={16} color="$secondary7" textAlign="center">
                        No active downloads
                      </Text>
                    </YStack>
                  ) : (
                    <YStack gap={12}>
                      {Object.entries(downloads).map(([key, download]) => (
                        <ModelCard key={key}>
                          <XStack alignItems="center" justifyContent="space-between">
                            <YStack gap={4}>
                              <Text fontSize={15} fontWeight="600" color="$secondary11">
                                {download.modelName}
                              </Text>
                              <Text fontSize={12} color="$secondary6">
                                {download.backend}
                              </Text>
                            </YStack>
                            <Badge variant="downloading">
                              <Download size={12} color="$primary8" />
                              <Text fontSize={11} color="$primary8">
                                {Math.round(download.progress)}%
                              </Text>
                            </Badge>
                          </XStack>

                          <YStack gap={8}>
                            <Progress value={download.progress} max={100} backgroundColor="$secondary4">
                              <Progress.Indicator backgroundColor="$primary6" />
                            </Progress>
                            <Text fontSize={11} color="$secondary6">
                              {download.message}
                            </Text>
                          </YStack>
                        </ModelCard>
                      ))}
                    </YStack>
                  )}
                </YStack>
              </Tabs.Content>
            </ScrollView>
          </Tabs>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}
