/**
 * Audio Recorder Module
 * Handles browser-based audio recording using MediaRecorder API
 */

class AudioRecorder {
  constructor() {
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.audioBlob = null;
    this.stream = null;
    this.startTime = null;
    this.timerInterval = null;
  }

  /**
   * Check if audio recording is supported
   */
  isSupported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  /**
   * Request microphone permission and start recording
   */
  async startRecording(onTimeUpdate = null) {
    if (!this.isSupported()) {
      throw new Error('Audio recording is not supported in this browser');
    }

    try {
      // Request microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000, // 16kHz is optimal for speech recognition
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Determine the best MIME type
      const mimeType = this.getSupportedMimeType();

      // Create MediaRecorder instance
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: mimeType,
        audioBitsPerSecond: 128000
      });

      this.audioChunks = [];

      // Handle data available event
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      // Start recording
      this.mediaRecorder.start(1000); // Collect data every second
      this.startTime = Date.now();

      // Start timer
      if (onTimeUpdate) {
        this.timerInterval = setInterval(() => {
          const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
          onTimeUpdate(elapsed);
        }, 1000);
      }

      return true;
    } catch (error) {
      console.error('Error starting recording:', error);
      throw new Error(`Failed to access microphone: ${error.message}`);
    }
  }

  /**
   * Stop recording and return audio blob
   */
  async stopRecording() {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No active recording'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        // Create blob from chunks
        this.audioBlob = new Blob(this.audioChunks, {
          type: this.mediaRecorder.mimeType
        });

        // Stop all tracks
        if (this.stream) {
          this.stream.getTracks().forEach(track => track.stop());
        }

        // Clear timer
        if (this.timerInterval) {
          clearInterval(this.timerInterval);
          this.timerInterval = null;
        }

        const duration = (Date.now() - this.startTime) / 1000;

        resolve({
          blob: this.audioBlob,
          duration: duration,
          mimeType: this.mediaRecorder.mimeType
        });
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * Get supported MIME type for recording
   */
  getSupportedMimeType() {
    const types = [
      'audio/mp4',              // Best support in torchaudio
      'audio/ogg;codecs=opus',  // Good support, native in torchaudio
      'audio/webm;codecs=opus', // Fallback (requires FFmpeg backend)
      'audio/webm',
      'audio/wav'
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return ''; // Use default
  }

  /**
   * Create an audio element for playback
   */
  createAudioElement() {
    if (!this.audioBlob) {
      throw new Error('No recorded audio available');
    }

    const url = URL.createObjectURL(this.audioBlob);
    const audio = new Audio(url);
    return audio;
  }

  /**
   * Get file extension from MIME type
   */
  getFileExtension(mimeType) {
    const mapping = {
      'audio/webm': 'webm',
      'audio/ogg': 'ogg',
      'audio/mp4': 'm4a',
      'audio/wav': 'wav'
    };

    for (const [mime, ext] of Object.entries(mapping)) {
      if (mimeType.includes(mime)) {
        return ext;
      }
    }

    return 'webm'; // Default
  }

  /**
   * Cancel recording and release resources
   */
  cancelRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }

    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    this.audioChunks = [];
    this.audioBlob = null;
  }
}

// Export for use in app.js
window.AudioRecorder = AudioRecorder;
