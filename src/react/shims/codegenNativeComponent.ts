// Shim for react-native codegenNativeComponent (not available in react-native-web)
// This is used by some RN packages like react-native-safe-area-context

import { View } from 'react-native-web'

export default function codegenNativeComponent<T>(_name: string): React.ComponentType<T> {
  return View as unknown as React.ComponentType<T>
}
