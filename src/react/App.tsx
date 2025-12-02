import React from 'react'
import { TamaguiProvider, Theme } from 'tamagui'
import { VAIStudioFeatureScreen } from './features/screen'
import { config } from './tamagui.config'

export function App() {
  return (
    <TamaguiProvider config={config}>
      <Theme name="vai_dark">
        <VAIStudioFeatureScreen />
      </Theme>
    </TamaguiProvider>
  )
}

export default App
