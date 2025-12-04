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

// Toast notifications
export { Toast, ToastProvider } from './Toast'

// Loading states
export { LoadingScreen, LoadingOverlay } from './LoadingScreen'

// Results display
export { ResultCard } from './ResultCard'
export type { ResultCardProps } from './ResultCard'

export { ResultsPanel } from './ResultsPanel'
export type { ResultsPanelProps, TranscriptionResultItem } from './ResultsPanel'

// Recording
export { RecordingControls, RecordingOverlayConnected } from './RecordingControls'

// Modals
export { SettingsModal } from './SettingsModal'
export { ModelManagerModal } from './ModelManagerModal'
export { AuthModal } from './AuthModal'

// System
export { UpdateBanner } from './UpdateBanner'
export { ErrorBoundary } from './ErrorBoundary'

// Batch processing
export { BatchFilesList } from './BatchFilesList'
