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

  const startRecording = useCallback(async () => {
    if (!isSupported) {
      showToast('Audio recording is not supported in this browser', 'error')
      return
    }

    try {
      setRecordingTime(0)
      await audioService.startRecording((seconds) => {
        setRecordingTime(seconds)
      })

      setIsRecording(true)
      showToast('Recording started', 'info')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start recording'
      showToast(message, 'error')
    }
  }, [isSupported, setIsRecording, showToast])

  const stopRecording = useCallback(async () => {
    try {
      const { blob, mimeType, duration } = await audioService.stopRecording()

      // Save recording to disk
      const saveResult = await audioService.saveRecording(blob, mimeType, duration)

      if (saveResult.success && saveResult.filePath && saveResult.fileName) {
        setRecordedAudio({
          blob,
          mimeType,
          duration,
          filePath: saveResult.filePath,
          fileName: saveResult.fileName
        })

        setIsRecording(false)
        showToast('Recording stopped', 'success')
      } else {
        throw new Error(saveResult.error || 'Failed to save recording')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to stop recording'
      showToast(message, 'error')
      setIsRecording(false)
    }
  }, [setIsRecording, setRecordedAudio, showToast])

  const playRecording = useCallback(() => {
    if (!recordedAudio || !recordedAudio.filePath) {
      showToast('No recording available', 'error')
      return
    }

    try {
      const audio = audioService.createAudioPlayer(recordedAudio.filePath)

      audio.play()
        .then(() => {
          showToast('Playing recording...', 'info', 1000)
        })
        .catch((err) => {
          showToast(`Playback failed: ${err.message}`, 'error')
        })

      audio.onended = () => {
        showToast('Playback finished', 'success', 1000)
      }

      audio.onerror = () => {
        showToast('Audio playback error', 'error')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to play audio'
      showToast(message, 'error')
    }
  }, [recordedAudio, showToast])

  const discardRecording = useCallback(() => {
    setRecordedAudio(null)
    setRecordingTime(0)
    showToast('Recording discarded', 'info')
  }, [setRecordedAudio, showToast])

  const useRecording = useCallback(() => {
    if (!recordedAudio || !recordedAudio.filePath) {
      showToast('No recording available', 'error')
      return
    }

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
