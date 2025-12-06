/**
 * Audio Recorder Hook
 * Manages audio recording functionality
 */

import { useState, useCallback } from 'react'
import { audioService } from '@services/audio.service'
import { useAppStore } from '@stores/useAppStore'
import { useToastStore } from '@stores/useToastStore'

export function useAudioRecorder() {
  const [recordingTime, setRecordingTime] = useState(0)

  const {
    isRecording,
    recordedAudio,
    setIsRecording,
    setRecordedAudio,
    setSelectedFile
  } = useAppStore()

  const { showToast } = useToastStore()

  const isSupported = audioService.isRecordingSupported()

  const startRecording = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    console.log('[useAudioRecorder] startRecording called, isSupported:', isSupported)

    if (!isSupported) {
      const errorMsg = `Recording not supported: navigator=${typeof navigator}, mediaDevices=${typeof navigator?.mediaDevices}, MediaRecorder=${typeof MediaRecorder}`
      console.error('[useAudioRecorder]', errorMsg)
      showToast('Audio recording is not supported in this browser', 'error')
      return { success: false, error: errorMsg }
    }

    try {
      console.log('[useAudioRecorder] Initializing audio service...')
      setRecordingTime(0)
      await audioService.startRecording((seconds) => {
        setRecordingTime(seconds)
      })

      console.log('[useAudioRecorder] Audio service started, setting isRecording=true')
      setIsRecording(true)
      showToast('Recording started', 'info')
      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start recording'
      console.error('[useAudioRecorder] Start recording failed:', err)
      showToast(message, 'error')
      return { success: false, error: message }
    }
  }, [isSupported, setIsRecording, showToast])

  const stopRecording = useCallback(async (): Promise<string | null> => {
    try {
      const { blob, mimeType, duration } = await audioService.stopRecording()
      console.log('[useAudioRecorder] Recording stopped', { mimeType, duration })

      // Save recording to disk
      const saveResult = await audioService.saveRecording(blob, mimeType, duration)
      console.log('[useAudioRecorder] Save result:', saveResult)

      if (saveResult.success && saveResult.filePath && saveResult.fileName) {
        setRecordedAudio({
          blob,
          mimeType,
          duration,
          filePath: saveResult.filePath,
          fileName: saveResult.fileName
        })

        setIsRecording(false)
        showToast(`Recording saved: ${saveResult.fileName}`, 'success')
        console.log('[useAudioRecorder] Recording saved to:', saveResult.filePath)

        // Return the file path so caller can use it immediately
        return saveResult.filePath
      } else {
        throw new Error(saveResult.error || 'Failed to save recording')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to stop recording'
      showToast(message, 'error')
      setIsRecording(false)
      console.error('[useAudioRecorder] Stop recording error:', err)
      return null
    }
  }, [setIsRecording, setRecordedAudio, showToast])

  const playRecording = useCallback(() => {
    if (!recordedAudio || !recordedAudio.filePath) {
      showToast('No recording available', 'error')
      return
    }

    try {
      const audio = audioService.createAudioPlayer(recordedAudio.filePath)

      // Cleanup function to properly release audio resources
      const cleanup = () => {
        audio.onended = null
        audio.onerror = null
        audio.pause()
        audio.src = ''
        audio.load() // Reset the audio element
      }

      audio.play()
        .then(() => {
          showToast('Playing recording...', 'info', 1000)
        })
        .catch((err) => {
          cleanup()
          showToast(`Playback failed: ${err.message}`, 'error')
        })

      audio.onended = () => {
        showToast('Playback finished', 'success', 1000)
        cleanup()
      }

      audio.onerror = () => {
        showToast('Audio playback error', 'error')
        cleanup()
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to play audio'
      showToast(message, 'error')
    }
  }, [recordedAudio, showToast])

  const discardRecording = useCallback(() => {
    console.log('[useAudioRecorder] Discarding recording')
    setRecordedAudio(null)
    setRecordingTime(0)
    showToast('Recording discarded', 'info')
  }, [setRecordedAudio, showToast])

  const useRecording = useCallback(() => {
    if (!recordedAudio || !recordedAudio.filePath) {
      showToast('No recording available', 'error')
      console.error('[useAudioRecorder] No recording to use')
      return
    }

    console.log('[useAudioRecorder] Using recording:', recordedAudio.filePath)
    setSelectedFile(recordedAudio.filePath)
    showToast('Recording ready for transcription', 'success')
  }, [recordedAudio, setSelectedFile, showToast])

  const openRecordingFolder = useCallback(() => {
    if (!recordedAudio || !recordedAudio.filePath) {
      showToast('No recording available', 'error')
      return
    }

    audioService.showItemInFolder(recordedAudio.filePath)
  }, [recordedAudio, showToast])

  const formatDuration = useCallback((seconds: number) => {
    return audioService.formatDuration(seconds)
  }, [])

  return {
    isSupported,
    isRecording,
    recordingTime,
    recordedAudio,
    startRecording,
    stopRecording,
    playRecording,
    discardRecording,
    useRecording,
    openRecordingFolder,
    formatDuration
  }
}
