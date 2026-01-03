import { MoonStar, Sun } from '@tamagui/lucide-icons'
import { useEffect, useState } from 'react'
import { AnimatePresence, Switch, View, XStack, YStack } from '@odd-design-system/ui-components'
import { useThemeControl } from '../../providers/OddProvider'

// Cloud/lines decoration for the track
function CloudLines() {
    return (
        <YStack gap={2}>
            <View width={8} height={2} backgroundColor="$color8" borderRadius={1} />
            <View marginLeft={2} width={8} height={2} backgroundColor="$color8" borderRadius={1} />
            <View width={6} height={2} backgroundColor="$color8" borderRadius={1} />
        </YStack>
    )
}

// Stars decoration for dark mode
function Stars() {
    return (
        <YStack position="relative" width={14} height={14}>
            <View position="absolute" top={2} left={2} width={3} height={3} backgroundColor="hsl(45, 100%, 51%)" borderRadius={2} opacity={1} />
            <View position="absolute" top={8} left={4} width={2} height={2} backgroundColor="hsl(45, 100%, 51%)" borderRadius={1} opacity={1} />
            <View position="absolute" top={4} left={10} width={2} height={2} backgroundColor="hsl(45, 100%, 51%)" borderRadius={1} opacity={1} />
            <View position="absolute" top={10} left={11} width={2} height={2} backgroundColor="hsl(45, 100%, 51%)" borderRadius={2} opacity={1} />
        </YStack>
    )
}

export function CustomThemeSwitch() {
    const { currentTheme, setTheme } = useThemeControl()
    const isDark = currentTheme === 'vai_dark'
    const [checked, setChecked] = useState(isDark)

    useEffect(() => {
        setChecked(isDark)
    }, [isDark])

    const iconSize = 14

    return (
        <View position="relative">
            <Switch
                checked={checked}
                onCheckedChange={(checked) => {
                    setTheme(checked ? 'vai_dark' : 'vai')
                }}
                size="$3"
                backgroundColor="$color3"
                cursor="pointer"
                borderWidth={1}
                borderColor="$color5"
                width={48}
                height={26}
                padding={2}
            >
                <Switch.Thumb
                    animation="quick"
                    backgroundColor="$background"
                    width={20}
                    height={20}
                    borderRadius="$10"
                >
                    <View
                        flex={1}
                        overflow="hidden"
                        borderRadius="$10"
                        alignItems="center"
                        justifyContent="center"
                        backgroundColor="$background"
                    >
                        <AnimatePresence exitBeforeEnter custom={{ direction: -1 }}>
                            <YStack
                                position="absolute"
                                key="Sun"
                                animation="quick"
                                fullscreen
                                alignItems="center"
                                justifyContent="center"
                                opacity={checked ? 0 : 1}
                                scale={!checked ? 1 : 0}
                            >
                                <Sun size={iconSize} fill="hsl(45, 100%, 51%)" color="hsl(45, 100%, 51%)" />
                            </YStack>

                            <YStack
                                position="absolute"
                                animation="quick"
                                key="moon"
                                fullscreen
                                alignItems="center"
                                justifyContent="center"
                                scale={checked ? 1 : 0}
                                opacity={checked ? 1 : 0}
                            >
                                <MoonStar color="hsl(45, 100%, 51%)" fill="hsl(45, 100%, 51%)" size={iconSize} />
                            </YStack>
                        </AnimatePresence>
                    </View>
                </Switch.Thumb>
            </Switch>

            {/* Track decorations overlay - on top of switch track, below thumb */}
            <XStack
                position="absolute"
                top={0}
                left={0}
                right={0}
                bottom={0}
                alignItems="center"
                justifyContent="space-between"
                paddingHorizontal={6}
                pointerEvents="none"
                zIndex={1}
            >
                {/* Left side - Stars (visible in dark mode when thumb is on right) */}
                <View opacity={checked ? 0.6 : 0}>
                    <Stars />
                </View>
                {/* Right side - Cloud lines (visible in light mode when thumb is on left) */}
                <View opacity={checked ? 0 : 1} marginRight={3}>
                    <CloudLines />
                </View>
            </XStack>
        </View>
    )
}
