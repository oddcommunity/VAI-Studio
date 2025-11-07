// Benchmark Suite Implementation
// This file contains the benchmarking functionality with REAL backend calls

let benchmarkSamples = [];

// Load benchmark samples from JSON
async function loadBenchmarkSamples() {
  try {
    const response = await fetch('../test-samples/benchmark-samples.json');
    const data = await response.json();
    benchmarkSamples = data.samples || [];
    return benchmarkSamples;
  } catch (error) {
    console.error('Error loading benchmark samples:', error);
    showToast('Failed to load benchmark samples', 'error');
    return [];
  }
}

// Initialize benchmark modal
function initBenchmark() {
  const benchmarkModal = document.getElementById('benchmark-modal');
  const benchmarkBtn = document.getElementById('benchmark-btn');
  const closeBtns = [
    document.getElementById('close-benchmark'),
    document.getElementById('close-benchmark-footer')
  ];

  if (benchmarkBtn) {
    benchmarkBtn.addEventListener('click', openBenchmark);
  }

  closeBtns.forEach(btn => {
    if (btn) btn.addEventListener('click', closeBenchmark);
  });

  const runBtn = document.getElementById('run-benchmark');
  if (runBtn) {
    runBtn.addEventListener('click', runBenchmark);
  }
}

async function openBenchmark() {
  const modal = document.getElementById('benchmark-modal');
  if (!modal) return;
  modal.classList.remove('hidden');

  // Load samples if not already loaded
  if (benchmarkSamples.length === 0) {
    await loadBenchmarkSamples();
  }

  populateBenchmarkBackends();
  displayBenchmarkSamples();
}

function closeBenchmark() {
  const modal = document.getElementById('benchmark-modal');
  if (modal) modal.classList.add('hidden');
}

function populateBenchmarkBackends() {
  const backendSelect = document.getElementById('benchmark-backend-select');
  const modelSelect = document.getElementById('benchmark-model-select');
  if (!backendSelect || !modelSelect) return;

  backendSelect.innerHTML = '<option value="">Select backend...</option>';
  for (const [name, backend] of Object.entries(state.backends)) {
    if (backend.available) {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name.charAt(0).toUpperCase() + name.slice(1);
      backendSelect.appendChild(option);
    }
  }

  backendSelect.onchange = (e) => {
    if (e.target.value) {
      modelSelect.disabled = false;
      modelSelect.innerHTML = '<option value="">Select model...</option>';
      const models = state.backends[e.target.value].models;
      models.forEach(model => {
        const opt = document.createElement('option');
        opt.value = JSON.stringify({ backend: e.target.value, model: model.name });
        opt.textContent = model.name;
        modelSelect.appendChild(opt);
      });
    } else {
      modelSelect.disabled = true;
    }
    updateRunButton();
  };

  modelSelect.onchange = updateRunButton;
}

function updateRunButton() {
  const runBtn = document.getElementById('run-benchmark');
  const modelSelect = document.getElementById('benchmark-model-select');
  if (runBtn && modelSelect) {
    runBtn.disabled = !modelSelect.value;
  }
}

function displayBenchmarkSamples() {
  const container = document.getElementById('benchmark-samples-list');
  if (!container) return;

  if (benchmarkSamples.length === 0) {
    container.innerHTML = '<p class="benchmark-empty">No benchmark samples available</p>';
    return;
  }

  container.innerHTML = '';
  benchmarkSamples.forEach(sample => {
    const card = document.createElement('div');
    card.className = 'benchmark-sample-card';
    card.innerHTML = `
      <div class="benchmark-sample-header">
        <span class="benchmark-sample-name">${sample.name}</span>
        <div class="benchmark-sample-meta">
          <span>Duration: ${sample.duration}</span>
          <span>Difficulty: ${sample.difficulty}</span>
        </div>
      </div>
      <div class="benchmark-sample-reference">"${sample.reference_text}"</div>
      <div class="benchmark-meta">
        Audio: ${sample.audio_path}
      </div>
    `;
    container.appendChild(card);
  });
}

async function runBenchmark() {
  const modelSelect = document.getElementById('benchmark-model-select');
  if (!modelSelect || !modelSelect.value) {
    showToast('Please select a model', 'error');
    return;
  }

  if (benchmarkSamples.length === 0) {
    showToast('No benchmark samples available', 'error');
    return;
  }

  const parsed = JSON.parse(modelSelect.value);
  const backend = parsed.backend;
  const model = parsed.model;

  const resultsContainer = document.getElementById('benchmark-results');
  const resultsContent = document.getElementById('benchmark-results-content');

  if (!resultsContainer || !resultsContent) return;

  resultsContainer.classList.remove('hidden');
  resultsContent.innerHTML = '<p class="benchmark-empty">Running benchmark...</p>';

  showToast('Benchmark started...', 'info');

  const results = [];

  // Run REAL benchmarks for each sample
  for (let i = 0; i < benchmarkSamples.length; i++) {
    const sample = benchmarkSamples[i];

    // Update progress
    resultsContent.innerHTML = `
      <p class="benchmark-empty">
        Running benchmark ${i + 1}/${benchmarkSamples.length}...<br>
        <small>Testing: ${sample.name}</small>
      </p>
    `;

    try {
      // Call REAL backend benchmark API
      const result = await window.electronAPI.benchmark({
        audioPath: sample.audio_path,
        backend: backend,
        modelName: model,
        referenceText: sample.reference_text
      });

      if (result.success) {
        results.push({
          sample: sample.name,
          reference: sample.reference_text,
          hypothesis: result.hypothesis_text,
          wer: result.wer,
          processingTime: result.processing_time,
          language: result.language,
          success: true
        });
      } else {
        results.push({
          sample: sample.name,
          reference: sample.reference_text,
          error: result.error,
          success: false
        });
      }
    } catch (error) {
      console.error('Benchmark error:', error);
      results.push({
        sample: sample.name,
        reference: sample.reference_text,
        error: error.message || 'Unknown error',
        success: false
      });
    }
  }

  displayBenchmarkResults(results, backend, model);

  const successCount = results.filter(r => r.success).length;
  if (successCount === results.length) {
    showToast('Benchmark complete!', 'success');
  } else {
    showToast(`Benchmark complete (${successCount}/${results.length} succeeded)`, 'warning');
  }
}

function displayBenchmarkResults(results, backend, model) {
  const resultsContent = document.getElementById('benchmark-results-content');
  if (!resultsContent) return;

  // Calculate averages (only for successful results)
  const successfulResults = results.filter(r => r.success);
  let avgWER = 0;
  let avgTime = 0;

  if (successfulResults.length > 0) {
    const totalWER = successfulResults.reduce((sum, r) => sum + r.wer, 0);
    const totalTime = successfulResults.reduce((sum, r) => sum + r.processingTime, 0);
    avgWER = (totalWER / successfulResults.length).toFixed(2);
    avgTime = (totalTime / successfulResults.length).toFixed(2);
  }

  // Build individual results HTML
  let resultsHTML = '';
  for (let i = 0; i < results.length; i++) {
    const r = results[i];

    if (r.success) {
      const werClass = getWERClass(r.wer);
      resultsHTML += `
        <div class="benchmark-result-box">
          <div class="benchmark-result-header">
            <strong>${r.sample}</strong>
            <span class="${werClass}">WER: ${r.wer.toFixed(2)}%</span>
          </div>
          <div class="benchmark-result-details">
            <strong>Reference:</strong> "${r.reference}"
          </div>
          <div class="benchmark-result-details">
            <strong>Hypothesis:</strong> "${r.hypothesis}"
          </div>
          <div class="benchmark-result-details">
            Processing time: ${r.processingTime}s
            ${r.language ? ` | Language: ${r.language}` : ''}
          </div>
        </div>
      `;
    } else {
      resultsHTML += `
        <div class="benchmark-error-box">
          <div class="benchmark-result-header">
            <strong>${r.sample}</strong>
            <span class="color-error">Failed</span>
          </div>
          <div class="benchmark-result-details color-error">
            Error: ${r.error}
          </div>
        </div>
      `;
    }
  }

  const avgWERClass = getWERClass(parseFloat(avgWER));

  resultsContent.innerHTML = `
    <div class="benchmark-result-card">
      <h4 class="benchmark-section-title">Model: ${backend} / ${model}</h4>
      <div class="benchmark-metrics">
        <div class="benchmark-metric">
          <div class="benchmark-metric-value ${avgWERClass}">${avgWER}%</div>
          <div class="benchmark-metric-label">Avg WER</div>
        </div>
        <div class="benchmark-metric">
          <div class="benchmark-metric-value">${avgTime}s</div>
          <div class="benchmark-metric-label">Avg Time</div>
        </div>
        <div class="benchmark-metric">
          <div class="benchmark-metric-value">${successfulResults.length}/${results.length}</div>
          <div class="benchmark-metric-label">Success Rate</div>
        </div>
      </div>
      <div class="benchmark-subsection">
        <h5 class="benchmark-subsection-title">Individual Results:</h5>
        ${resultsHTML}
      </div>
      <p class="benchmark-note">
        ✅ Real benchmark using actual transcription and WER calculation
      </p>
    </div>
  `;
}

function getWERClass(wer) {
  if (wer < 5) return 'wer-excellent';
  if (wer < 10) return 'wer-good';
  if (wer < 15) return 'wer-fair';
  return 'wer-poor';
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBenchmark);
} else {
  initBenchmark();
}
