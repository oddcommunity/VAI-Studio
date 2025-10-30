# LocalVoice AI - Benchmark Test Audio

This directory contains test audio samples for benchmarking STT model accuracy and performance.

## Benchmark Difficulty Levels

### Easy (Clear Audio, Simple Speech)
- **Characteristics**:
  - Clear recording, minimal background noise
  - Single speaker, standard accent
  - Normal speaking pace
  - Simple vocabulary
- **Expected WER**: < 5%
- **File**: `easy.m4a` (or .wav, .mp3)

### Medium (Moderate Challenges)
- **Characteristics**:
  - Some background noise
  - Faster speaking pace
  - Technical vocabulary or jargon
  - Possible slight accent
- **Expected WER**: 5-10%
- **File**: `medium.m4a`

### Hard (Challenging Audio)
- **Characteristics**:
  - Noisy environment
  - Multiple speakers or overlapping speech
  - Fast speech with filler words
  - Heavy accent or non-native speaker
  - Technical/domain-specific terminology
- **Expected WER**: 10-20%
- **File**: `hard.m4a`

### Very Hard (Extreme Challenges)
- **Characteristics**:
  - Very noisy environment (cafe, street, etc.)
  - Multiple overlapping speakers
  - Very fast or mumbled speech
  - Strong regional accent or dialect
  - Poor audio quality (low bitrate, distortion)
- **Expected WER**: 20%+
- **File**: `very_hard.m4a`

## Test Format

Each test file should include:
1. **Audio file**: M4A format (Mac Voice Memos compatible)
2. **Reference transcript**: `.txt` file with ground truth text
   - Example: `easy.txt` contains the exact words spoken in `easy.m4a`

## Running Benchmarks

Use the **Benchmark** feature in LocalVoice AI:
1. Click "📊 Run Benchmark" button
2. Select the model to test
3. Select the test sample (easy/medium/hard/very hard)
4. View WER (Word Error Rate) results

## Adding Your Own Test Samples

To add custom benchmark samples:

```bash
# Record or convert your audio to M4A
# Example: Record on Mac with Voice Memos app

# Create the transcript file
echo "Your exact spoken words here" > test_audio/custom.txt

# Name your files consistently
mv recording.m4a test_audio/custom.m4a
```

## Reference Text Format

Reference transcripts should be:
- **Exact verbatim** transcription
- Include filler words (um, uh, like)
- Use standard punctuation
- No speaker labels (unless testing diarization)

Example `easy.txt`:
```
The quick brown fox jumps over the lazy dog. This is a test of the speech recognition system.
```

## Sample Sources

You can use:
- Your own voice recordings (Mac Voice Memos)
- Public domain speech datasets (LibriSpeech, Common Voice)
- Generated speech from TTS systems (for controlled tests)

## Current Test Files

- `test.m4a` - Basic tone test (2 seconds, 1kHz sine wave)
  - **Purpose**: Verify M4A file loading works
  - **Not suitable for WER benchmarking** (no speech)

## TODO

- [ ] Add real speech sample for easy.m4a + easy.txt
- [ ] Add real speech sample for medium.m4a + medium.txt
- [ ] Add real speech sample for hard.m4a + hard.txt
- [ ] Add real speech sample for very_hard.m4a + very_hard.txt
