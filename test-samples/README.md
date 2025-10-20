# Benchmark Test Samples

## Overview

This directory contains reference test samples for benchmarking STT models.

## Samples

### 1. Short Sample (5 seconds)
**File**: test_short.txt
**Text**: "The quick brown fox jumps over the lazy dog."
**Use**: Basic accuracy test, fast processing

### 2. Medium Sample (30 seconds)
**File**: test_medium.txt
**Text**: "Artificial intelligence is transforming how we interact with technology. Speech recognition systems can now understand natural language with remarkable accuracy, enabling voice assistants, transcription services, and accessibility tools that help millions of people every day."
**Use**: Standard accuracy and performance test

### 3. Long Sample (60 seconds)
**File**: test_long.txt
**Text**: "Machine learning has revolutionized the field of speech recognition. Modern systems use deep neural networks to convert spoken words into text with unprecedented accuracy. These advancements have made voice interfaces practical for everyday use, from smartphones to smart speakers. The technology continues to improve, with models getting smaller and faster while maintaining high accuracy across multiple languages and accents."
**Use**: Extended transcription test, stress testing

## Using Test Samples

In the Benchmark Suite:
1. Click "📊 Run Benchmark"
2. Select a backend and model
3. Choose test samples to run
4. Click "Run Benchmark"
5. View results with WER calculations

## Note

For actual audio testing, users can provide their own WAV files.
The app includes simulated benchmarks using text-based WER calculation for demonstration.
