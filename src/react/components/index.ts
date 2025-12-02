/**
 * VAI Studio Components
 *
 * A complete, production-ready UI for the VAI Studio application.
 * Built with Tamagui for cross-platform support (web + mobile).
 *
 * @example
 * ```tsx
 * import { VAIStudio, VAIStudioScreen } from './components/VAIStudio'
 *
 * // Basic usage with default welcome screen
 * <VAIStudioScreen
 *   models={[{ id: 'whisper', name: 'Whisper Large' }]}
 *   onTranscribe={() => console.log('Transcribe clicked')}
 * />
 *
 * // With custom content
 * <VAIStudio>
 *   <TranscriptionResults />
 * </VAIStudio>
 * ```
 */

export { VAIStudio, VAIStudioScreen } from './VAIStudio'
export type { VAIStudioProps } from './VAIStudio'

export { Sidebar } from './Sidebar'
export type { SidebarProps, Model } from './Sidebar'

export { WelcomeScreen } from './WelcomeScreen'
export type { WelcomeScreenProps } from './WelcomeScreen'

export {
  GraphicEqIcon,
  AudioFileIcon,
  MicIcon,
  PlusIcon,
  SettingsIcon,
  FolderIcon,
  CheckCircleIcon,
  ChevronDownIcon,
} from './Icons'
