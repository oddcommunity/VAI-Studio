import React, { useState, useMemo, useCallback } from 'react'
import {
  YStack,
  XStack,
  Text,
  Input,
  useTheme,
  ScrollView,
} from '@odd-design-system/ui-components'
import { ChevronDown, ChevronRight, Search, Check, Circle, Download } from '@tamagui/lucide-icons'

export interface ModelItem {
  id: string
  name: string
  size: string
  installed?: boolean
}

export interface ModelGroup {
  backend: string
  displayName: string
  provider: string
  models: ModelItem[]
}

export interface GroupedModelSelectorProps {
  groups: ModelGroup[]
  selectedModel?: string
  onModelChange?: (modelId: string) => void
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  // Multi-select mode for comparison
  multiSelect?: boolean
  selectedModels?: string[]
  onModelsChange?: (models: string[]) => void
}

// Map backend names to display names and providers
const BACKEND_INFO: Record<string, { displayName: string; provider: string }> = {
  whisper: { displayName: 'WHISPER', provider: 'OpenAI' },
  'faster-whisper': { displayName: 'FASTER WHISPER', provider: 'Systran' },
  'whisper.cpp': { displayName: 'WHISPER.CPP', provider: 'ggerganov' },
  voxtral: { displayName: 'VOXTRAL', provider: 'Mistral AI' },
  parakeet: { displayName: 'PARAKEET', provider: 'NVIDIA' },
  granite: { displayName: 'GRANITE', provider: 'IBM' },
  wav2vec_bert: { displayName: 'WAV2VEC_BERT', provider: 'Meta' },
  canary: { displayName: 'CANARY', provider: 'NVIDIA' },
  seamless: { displayName: 'SEAMLESS', provider: 'Meta' },
}

function getBackendInfo(backend: string): { displayName: string; provider: string } {
  return BACKEND_INFO[backend.toLowerCase()] || {
    displayName: backend.toUpperCase(),
    provider: backend
  }
}

export function GroupedModelSelector({
  groups,
  selectedModel,
  onModelChange,
  isOpen,
  onOpenChange,
  multiSelect = false,
  selectedModels = [],
  onModelsChange,
}: GroupedModelSelectorProps) {
  const theme = useTheme()
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  // Get selected model display name
  const selectedModelName = useMemo(() => {
    if (multiSelect) {
      if (selectedModels.length === 0) return 'Select models to compare'
      if (selectedModels.length === 1) {
        try {
          const parsed = JSON.parse(selectedModels[0])
          return `${parsed.model} (${parsed.backend})`
        } catch {
          return selectedModels[0]
        }
      }
      return `${selectedModels.length} models selected`
    }
    if (!selectedModel) return 'Select a model'
    try {
      const parsed = JSON.parse(selectedModel)
      return `${parsed.model} (${parsed.backend})`
    } catch {
      return selectedModel
    }
  }, [selectedModel, multiSelect, selectedModels])

  // Filter groups based on search
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groups

    const query = searchQuery.toLowerCase()
    return groups
      .map(group => {
        const info = getBackendInfo(group.backend)
        const groupMatches =
          info.displayName.toLowerCase().includes(query) ||
          info.provider.toLowerCase().includes(query)

        const filteredModels = group.models.filter(model =>
          model.name.toLowerCase().includes(query) ||
          model.size.toLowerCase().includes(query)
        )

        if (groupMatches) return group
        if (filteredModels.length > 0) {
          return { ...group, models: filteredModels }
        }
        return null
      })
      .filter((g): g is ModelGroup => g !== null)
  }, [groups, searchQuery])

  // Total model count
  const totalModels = useMemo(() =>
    groups.reduce((sum, g) => sum + g.models.length, 0),
    [groups]
  )

  const toggleGroup = useCallback((backend: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(backend)) {
        next.delete(backend)
      } else {
        next.add(backend)
      }
      return next
    })
  }, [])

  const handleModelSelect = useCallback((backend: string, modelName: string) => {
    const modelId = JSON.stringify({ backend, model: modelName })

    if (multiSelect) {
      // Toggle selection in multi-select mode
      const isCurrentlySelected = selectedModels.includes(modelId)
      if (isCurrentlySelected) {
        onModelsChange?.(selectedModels.filter(id => id !== modelId))
      } else {
        onModelsChange?.([...selectedModels, modelId])
      }
      // Don't close dropdown in multi-select mode
    } else {
      onModelChange?.(modelId)
      onOpenChange(false)
    }
  }, [onModelChange, onOpenChange, multiSelect, selectedModels, onModelsChange])

  if (!isOpen) {
    return (
      <XStack
        width="100%"
        backgroundColor="$color4"
        borderRadius={6}
        paddingHorizontal={12}
        paddingVertical={10}
        height={40}
        alignItems="center"
        justifyContent="space-between"
        cursor="pointer"
        hoverStyle={{ backgroundColor: '$color5' }}
        onPress={() => onOpenChange(true)}
      >
        <Text
          color="$color"
          fontSize="$3"
          fontFamily="$body"
          flex={1}
          numberOfLines={1}
        >
          {selectedModelName}
        </Text>
        <ChevronDown size={18} color={theme.color10?.val} />
      </XStack>
    )
  }

  return (
    <YStack
      position="absolute"
      top={24}
      left={0}
      right={0}
      zIndex={100}
      backgroundColor="$color3"
      borderRadius={8}
      borderWidth={1}
      borderColor="$color5"
      overflow="hidden"
      // @ts-ignore - web shadow
      style={{
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
      }}
    >
      {/* Header with close */}
      <XStack
        backgroundColor="$color4"
        paddingHorizontal={12}
        paddingVertical={10}
        alignItems="center"
        justifyContent="space-between"
        borderBottomWidth={1}
        borderBottomColor="$color5"
        cursor="pointer"
        onPress={() => onOpenChange(false)}
      >
        <Text color="$color" fontSize="$3" fontFamily="$body">
          Select a model
        </Text>
        <ChevronDown size={18} color={theme.color10?.val} style={{ transform: [{ rotate: '180deg' }] }} />
      </XStack>

      {/* Search Input */}
      <XStack
        paddingHorizontal={10}
        paddingVertical={8}
        backgroundColor="$color4"
        alignItems="center"
        gap={6}
      >
        <Search size={16} color={theme.color9?.val} />
        <Input
          flex={1}
          backgroundColor="#FFFFFF"
          borderWidth={0}
          borderRadius={6}
          paddingHorizontal={10}
          paddingVertical={6}
          height={32}
          placeholder="Search models..."
          placeholderTextColor="$color9"
          color="$color12"
          fontSize="$2"
          fontFamily="$body"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </XStack>

      {/* Model Groups */}
      <ScrollView
        maxHeight={220}
        showsVerticalScrollIndicator={true}
        scrollIndicatorInsets={{ right: 2 }}
        backgroundColor="$background"
        // @ts-ignore - web scrollbar styling
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'hsl(215, 60%, 45%) rgba(255, 255, 255, 0.9)',
        }}
      >
        <YStack paddingVertical={4}>
          {filteredGroups.map(group => {
            const info = getBackendInfo(group.backend)
            const isExpanded = expandedGroups.has(group.backend)

            return (
              <YStack key={group.backend}>
                {/* Group Header */}
                <XStack
                  paddingHorizontal={10}
                  paddingVertical={6}
                  marginVertical={1}
                  alignItems="center"
                  justifyContent="space-between"
                  cursor="pointer"
                  hoverStyle={{ backgroundColor: '$color4' }}
                  onPress={() => toggleGroup(group.backend)}
                >
                  <XStack alignItems="center" gap={6} flex={1} overflow="hidden">
                    {isExpanded ? (
                      <ChevronDown size={16} color={theme.color9?.val} />
                    ) : (
                      <ChevronRight size={16} color={theme.color9?.val} />
                    )}
                    <Text
                      fontSize="$1"
                      fontWeight="600"
                      color="$color"
                      fontFamily="$body"
                    >
                      {info.displayName}
                    </Text>
                    <Text
                      fontSize="$1"
                      color="$color9"
                      fontFamily="$body"
                    >
                      ({info.provider})
                    </Text>
                  </XStack>
                  <Text
                    fontSize="$1"
                    color="$color9"
                    fontFamily="$body"
                    flexShrink={0}
                  >
                    {group.models.length} {group.models.length === 1 ? 'model' : 'models'}
                  </Text>
                </XStack>

                {/* Model Items */}
                {isExpanded && (
                  <YStack paddingLeft={24} paddingRight={12}>
                    {group.models.map(model => {
                      const modelId = JSON.stringify({ backend: group.backend, model: model.name })
                      const isSelected = multiSelect
                        ? selectedModels.includes(modelId)
                        : selectedModel === modelId

                      return (
                        <XStack
                          key={model.id}
                          group="modelItem"
                          // @ts-ignore - className for CSS hover
                          className="model-row"
                          paddingVertical={6}
                          paddingHorizontal={10}
                          marginVertical={1}
                          borderRadius={4}
                          alignItems="center"
                          justifyContent="space-between"
                          cursor="pointer"
                          backgroundColor={isSelected ? 'hsl(215, 83%, 50%)' : 'transparent'}
                          hoverStyle={{ backgroundColor: 'hsl(215, 83%, 50%)' }}
                          onPress={() => handleModelSelect(group.backend, model.name)}
                        >
                          <YStack flex={1}>
                            <Text
                              fontSize="$2"
                              color={isSelected ? '#FFFFFF' : '$color'}
                              fontFamily="$body"
                              fontWeight={isSelected ? '600' : '400'}
                              $group-modelItem-hover={{ color: '#FFFFFF' }}
                            >
                              {model.name}
                            </Text>
                            <Text
                              fontSize="$1"
                              color={isSelected ? 'rgba(255,255,255,0.7)' : '$color9'}
                              fontFamily="$body"
                              $group-modelItem-hover={{ color: 'rgba(255,255,255,0.7)' }}
                            >
                              {model.size}
                            </Text>
                          </YStack>
                          <XStack
                            width={16}
                            height={16}
                            alignItems="center"
                            justifyContent="center"
                          >
                            {isSelected ? (
                              <Check size={16} color="#FFFFFF" />
                            ) : model.installed === false ? (
                              <Download
                                size={14}
                                color={theme.color9?.val}
                                $group-modelItem-hover={{ color: '#FFFFFF' }}
                              />
                            ) : (
                              <Circle
                                size={16}
                                color={theme.color9?.val}
                                $group-modelItem-hover={{ color: '#FFFFFF' }}
                              />
                            )}
                          </XStack>
                        </XStack>
                      )
                    })}
                  </YStack>
                )}
              </YStack>
            )
          })}
        </YStack>
      </ScrollView>

      {/* Footer */}
      <XStack
        paddingHorizontal={12}
        paddingVertical={8}
        backgroundColor="$color4"
        borderTopWidth={1}
        borderTopColor="$color5"
      >
        <Text fontSize="$1" color="$color9" fontFamily="$body">
          {totalModels} models
        </Text>
      </XStack>
    </YStack>
  )
}
