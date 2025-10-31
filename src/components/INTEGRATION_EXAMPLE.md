# Quick Integration Example

This guide shows you exactly how to replace the old model selector with the new enhanced component.

## Quick Start (5 minutes)

### Step 1: Add the component files to index.html

Open `/Users/exeai/Projects/localvoiceAI/src/index.html` and add these lines before the closing `</body>` tag (around line 325):

```html
<!-- Enhanced Model Selector Component -->
<link rel="stylesheet" href="components/ModelSelector.css">
<script src="components/ModelSelector.js"></script>

<script src="app.js"></script>
<script src="benchmark.js"></script>
</body>
```

### Step 2: Update the HTML structure

In `index.html`, find the model selector section (around line 41-50) and replace it:

**OLD CODE (REMOVE)**:
```html
<section class="control-section">
  <h2>Model</h2>
  <select id="model-select" class="select-input">
    <option value="">Select a model</option>
  </select>
  <div id="model-info" class="model-info hidden">
    <span class="model-size"></span>
    <span class="model-wer"></span>
  </div>
</section>
```

**NEW CODE (ADD)**:
```html
<section class="control-section">
  <h2>Model</h2>
  <div id="model-select-container"></div>
  <div id="model-info" class="model-info hidden">
    <span class="model-size"></span>
    <span class="model-wer"></span>
  </div>
</section>
```

### Step 3: Update comparison mode selectors (Optional)

If you want to also upgrade the comparison mode selectors, find lines 58-65 and update:

**OLD CODE (REMOVE)**:
```html
<div id="comparison-options" class="hidden">
  <select id="model-select-2" class="select-input">
    <option value="">Select second model</option>
  </select>
  <select id="model-select-3" class="select-input">
    <option value="">Select third model (optional)</option>
  </select>
</div>
```

**NEW CODE (ADD)**:
```html
<div id="comparison-options" class="hidden">
  <div id="model-select-2-container"></div>
  <div id="model-select-3-container"></div>
</div>
```

### Step 4: Update app.js

Open `/Users/exeai/Projects/localvoiceAI/src/app.js` and make these changes:

#### A. Add selector instances at the top (after line 14):

```javascript
// State
let state = {
  backends: {},
  selectedBackend: null,
  selectedFile: null,
  comparisonMode: false,
  activeTranscriptions: 0,
  batchMode: false,
  batchFiles: [],
  batchProcessing: false
};

// ADD THESE LINES:
let modelSelector = null;
let modelSelector2 = null;
let modelSelector3 = null;
```

#### B. Replace the loadBackends function (around line 92):

**OLD CODE (REMOVE - lines 92-105)**:
```javascript
async function loadBackends() {
  try {
    const result = await window.electronAPI.listBackends();
    if (result.success) {
      state.backends = result.backends;
      populateAllModelsForComparison();
    } else {
      showError('Failed to load backends: ' + result.error);
    }
  } catch (error) {
    showError('Error loading backends: ' + error.message);
  }
}
```

**NEW CODE (ADD)**:
```javascript
async function loadBackends() {
  try {
    const result = await window.electronAPI.listBackends();
    if (result.success) {
      state.backends = result.backends;

      // Initialize main model selector
      if (!modelSelector) {
        modelSelector = new ModelSelector('model-select-container', {
          placeholder: 'Select a model',
          showSearch: true,
          onChange: (selection) => {
            console.log('Model selected:', selection);
            updateModelInfoFromSelection(selection);
            updateTranscribeButton();
          }
        });
      }

      modelSelector.setModels(result.backends);
    } else {
      showError('Failed to load backends: ' + result.error);
    }
  } catch (error) {
    showError('Error loading backends: ' + error.message);
  }
}
```

#### C. Add new helper function (after loadBackends):

```javascript
// Update model info from selector
function updateModelInfoFromSelection(selection) {
  if (!selection) {
    elements.modelInfo.classList.add('hidden');
    return;
  }

  const model = selection.data;
  elements.modelInfo.classList.remove('hidden');
  elements.modelInfo.querySelector('.model-size').textContent = 'Size: ' + model.size;
  elements.modelInfo.querySelector('.model-wer').textContent = 'WER: ' + model.wer;
}
```

#### D. Update comparison mode handler (around line 201):

**FIND THIS (around line 201-214)**:
```javascript
elements.comparisonMode.addEventListener('change', (e) => {
  state.comparisonMode = e.target.checked;
  elements.comparisonOptions.classList.toggle('hidden', !state.comparisonMode);

  if (state.comparisonMode) {
    populateAllModelsForComparison();
  } else if (state.selectedBackend) {
    populateModelSelects(state.selectedBackend);
  }

  updateTranscribeButton();
});
```

**REPLACE WITH**:
```javascript
elements.comparisonMode.addEventListener('change', (e) => {
  state.comparisonMode = e.target.checked;
  elements.comparisonOptions.classList.toggle('hidden', !state.comparisonMode);

  if (state.comparisonMode) {
    // Initialize additional selectors for comparison mode
    if (!modelSelector2) {
      modelSelector2 = new ModelSelector('model-select-2-container', {
        placeholder: 'Select second model',
        showSearch: true,
        onChange: (selection) => {
          console.log('Second model selected:', selection);
          updateTranscribeButton();
        }
      });
      modelSelector2.setModels(state.backends);
    }

    if (!modelSelector3) {
      modelSelector3 = new ModelSelector('model-select-3-container', {
        placeholder: 'Select third model (optional)',
        showSearch: true,
        onChange: (selection) => {
          console.log('Third model selected:', selection);
          updateTranscribeButton();
        }
      });
      modelSelector3.setModels(state.backends);
    }
  }

  updateTranscribeButton();
});
```

#### E. Update transcribe button logic (around line 260):

**FIND THIS (around line 260-267)**:
```javascript
function updateTranscribeButton() {
  const hasFile = state.selectedFile !== null;
  const hasModel = elements.modelSelect.value !== '';
  const hasModels = state.comparisonMode
    ? hasModel && elements.modelSelect2.value !== ''
    : hasModel;
  elements.transcribeBtn.disabled = !(hasFile && hasModels);
}
```

**REPLACE WITH**:
```javascript
function updateTranscribeButton() {
  const hasFile = state.selectedFile !== null;
  const hasModel = modelSelector && modelSelector.getValue() !== '';
  const hasModels = state.comparisonMode
    ? hasModel && modelSelector2 && modelSelector2.getValue() !== ''
    : hasModel;
  elements.transcribeBtn.disabled = !(hasFile && hasModels);
}
```

#### F. Update handleTranscribe function (around line 270):

**FIND THIS (around line 270-277)**:
```javascript
async function handleTranscribe() {
  const models = [elements.modelSelect.value];
  if (state.comparisonMode) {
    models.push(elements.modelSelect2.value);
    if (elements.modelSelect3.value) {
      models.push(elements.modelSelect3.value);
    }
  }
  // ... rest of function
}
```

**REPLACE WITH**:
```javascript
async function handleTranscribe() {
  const models = [modelSelector.getValue()];
  if (state.comparisonMode) {
    models.push(modelSelector2.getValue());
    if (modelSelector3 && modelSelector3.getValue()) {
      models.push(modelSelector3.getValue());
    }
  }
  // ... rest of function (keep everything else the same)
}
```

#### G. Update batch transcribe function (around line 484):

**FIND THIS (around line 484-490)**:
```javascript
async function handleBatchTranscribe() {
  if (state.batchFiles.length === 0) {
    showToast('No files in batch queue', 'error');
    return;
  }

  const modelStr = elements.modelSelect.value;
  if (!modelStr) {
    showToast('Please select a model', 'error');
    return;
  }
  // ... rest of function
}
```

**REPLACE WITH**:
```javascript
async function handleBatchTranscribe() {
  if (state.batchFiles.length === 0) {
    showToast('No files in batch queue', 'error');
    return;
  }

  const modelStr = modelSelector.getValue();
  if (!modelStr) {
    showToast('Please select a model', 'error');
    return;
  }
  // ... rest of function (keep everything else the same)
}
```

#### H. Update batch button logic (around line 461):

**FIND THIS (around line 461-475)**:
```javascript
function updateBatchButton() {
  const hasFiles = state.batchFiles.length > 0;
  const hasModel = elements.modelSelect.value !== '';

  if (hasFiles) {
    elements.transcribeBatchBtn.classList.remove('hidden');
    elements.transcribeBtn.classList.add('hidden');
    elements.transcribeBatchBtn.disabled = !hasModel;
  } else {
    elements.transcribeBatchBtn.classList.add('hidden');
    elements.transcribeBtn.classList.remove('hidden');
    updateTranscribeButton();
  }
}
```

**REPLACE WITH**:
```javascript
function updateBatchButton() {
  const hasFiles = state.batchFiles.length > 0;
  const hasModel = modelSelector && modelSelector.getValue() !== '';

  if (hasFiles) {
    elements.transcribeBatchBtn.classList.remove('hidden');
    elements.transcribeBtn.classList.add('hidden');
    elements.transcribeBatchBtn.disabled = !hasModel;
  } else {
    elements.transcribeBatchBtn.classList.add('hidden');
    elements.transcribeBtn.classList.remove('hidden');
    updateTranscribeButton();
  }
}
```

#### I. Remove old functions (OPTIONAL - can keep for now):

You can remove these functions as they're no longer used:
- `populateBackendSelect()` (line 108)
- `populateModelSelects()` (line 121)
- `populateAllModelsForComparison()` (line 138)
- `updateModelInfo()` (line 240) - replaced by `updateModelInfoFromSelection()`

But **it's safer to leave them** until you confirm everything works.

### Step 5: Test it!

1. Start your app: `npm start`
2. Click on the model selector
3. Try searching for a model
4. Use arrow keys to navigate
5. Select a model
6. Enable comparison mode and test multiple selectors

## Visual Preview

**The new dropdown will look like this:**

```
┌─────────────────────────────────────────┐
│ Whisper Large V3                        │
│ OpenAI • ~1.5GB                         │
└─────────────────────────────────────────┘
                ↓ (click to open)
┌─────────────────────────────────────────┐
│ 🔍 Search models...                     │
├─────────────────────────────────────────┤
│ WHISPER (14 MODELS)           [14]      │
│  ┌─────────────────────────────────┐    │
│  │ Tiny              [Installed]   │    │
│  │ OpenAI                          │    │
│  │ ○ 39MB • ◼ WER: ~15%           │    │
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │ Base              [Installed]   │    │
│  │ OpenAI                          │    │
│  │ ○ 74MB • ◼ WER: ~10%           │    │
│  └─────────────────────────────────┘    │
│                                         │
│ VOXTRAL (2 MODELS)             [2]      │
│  ┌─────────────────────────────────┐    │
│  │ Mini-3B           [Not Install] │    │
│  │ Mistral AI                      │    │
│  │ ○ ~6GB • ◼ WER: 6.68%          │    │
│  └─────────────────────────────────┘    │
├─────────────────────────────────────────┤
│ 22 models                               │
└─────────────────────────────────────────┘
```

## Troubleshooting

### "ModelSelector is not defined"
- **Issue**: Script loaded in wrong order
- **Fix**: Make sure `ModelSelector.js` loads before `app.js` in index.html

### Dropdown doesn't open
- **Issue**: Container element not found
- **Fix**: Check that `<div id="model-select-container"></div>` exists in HTML

### Styles look wrong
- **Issue**: CSS not loaded
- **Fix**: Check that `ModelSelector.css` is linked in index.html
- **Fix**: Clear browser cache (Cmd+Shift+R)

### Models don't populate
- **Issue**: Backend data format mismatch
- **Fix**: Check browser console for errors
- **Fix**: Verify `state.backends` has expected structure

### Search doesn't work
- **Issue**: Input event not firing
- **Fix**: Check browser console for JavaScript errors

## Rollback (If Needed)

If something goes wrong, you can easily rollback:

1. **Remove component imports** from index.html:
   - Delete the `<link>` and `<script>` tags for ModelSelector

2. **Restore old HTML**:
   - Change `<div id="model-select-container"></div>` back to `<select id="model-select" class="select-input">...</select>`

3. **Restore old JavaScript**:
   - Undo changes to `loadBackends()`, `handleTranscribe()`, etc.
   - The old code is still in your git history

4. **Reload**: Cmd+R to refresh the app

## Next Steps

Once you confirm it works:

1. ✅ Test with multiple models
2. ✅ Test comparison mode
3. ✅ Test batch processing
4. ✅ Test keyboard navigation
5. ✅ Test search functionality
6. 📝 Consider removing old functions from app.js
7. 🎨 Customize colors/styling if desired
8. 📊 Implement future enhancements (see UI_IMPROVEMENTS.md)

## Questions?

Check the full documentation in `UI_IMPROVEMENTS.md` for:
- Detailed design decisions
- Accessibility features
- Performance considerations
- Future enhancement ideas
