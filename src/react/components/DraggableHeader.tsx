import { XStack } from '@odd-design-system/ui-components'

export function DraggableHeader() {
    return (
        <XStack
            className="electron-drag-region"
            height={32}
            width="100%"
            backgroundColor="transparent"
            position="absolute"
            top={0}
            left={0}
            zIndex={1000}
            pointerEvents="auto"
        />
    )
}
