/**
 * ModelSelector Component
 * Enhanced custom dropdown for selecting STT models with improved UX
 */

class ModelSelector {
  constructor(containerId, options = {}) {
    console.log('[ModelSelector] Constructor called with containerId:', containerId);
    this.container = document.getElementById(containerId);

    if (!this.container) {
      console.error('[ModelSelector] Container element not found:', containerId);
      throw new Error(`ModelSelector: Container element '${containerId}' not found`);
    }

    console.log('[ModelSelector] Container element found:', this.container);

    this.options = {
      placeholder: options.placeholder || 'Select a model',
      showSearch: options.showSearch !== false,
      showBadges: options.showBadges !== false,
      onChange: options.onChange || (() => {}),
      ...options
    };

    this.models = [];
    this.selectedModel = null;
    this.isOpen = false;
    this.filteredModels = [];
    this.focusedIndex = -1;

    console.log('[ModelSelector] Calling init()');
    this.init();
    console.log('[ModelSelector] Constructor complete');
  }

  init() {
    console.log('[ModelSelector] init() called');
    this.render();
    console.log('[ModelSelector] render() complete');
    this.attachEventListeners();
    console.log('[ModelSelector] attachEventListeners() complete');
  }

  setModels(backends) {
    console.log('[ModelSelector] setModels called with:', backends);
    this.models = [];

    // Transform backend data into flat model list with grouping
    Object.keys(backends).forEach(backendName => {
      const backend = backends[backendName];

      backend.models.forEach(model => {
        this.models.push({
          backend: backendName,
          backendLabel: backend.name,
          name: model.name,
          company: model.company,
          size: model.size,
          params: model.params,
          wer: model.wer,
          installed: model.installed,
          features: model.features || [],
          value: JSON.stringify({ backend: backendName, model: model.name })
        });
      });
    });

    this.filteredModels = [...this.models];
    console.log('[ModelSelector] Total models loaded:', this.models.length);
    this.updateDropdownList();
  }

  render() {
    this.container.innerHTML = `
      <div class="model-selector">
        <button type="button" class="model-selector-trigger" aria-haspopup="listbox" aria-expanded="false">
          <span class="model-selector-value">${this.options.placeholder}</span>
          <svg class="model-selector-arrow" width="12" height="12" viewBox="0 0 12 12">
            <path fill="currentColor" d="M6 9L1 4h10z"/>
          </svg>
        </button>

        <div class="model-selector-dropdown hidden">
          ${this.options.showSearch ? `
            <div class="model-selector-search">
              <svg class="search-icon" width="16" height="16" viewBox="0 0 16 16">
                <path fill="currentColor" d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
              </svg>
              <input
                type="text"
                class="model-selector-search-input"
                placeholder="Search models..."
                autocomplete="off"
              />
            </div>
          ` : ''}

          <div class="model-selector-list" role="listbox">
            <!-- Dynamically populated -->
          </div>

          <div class="model-selector-footer">
            <span class="model-count"></span>
          </div>
        </div>
      </div>
    `;
  }

  updateDropdownList() {
    const listContainer = this.container.querySelector('.model-selector-list');
    const footerCount = this.container.querySelector('.model-count');

    if (this.filteredModels.length === 0) {
      listContainer.innerHTML = `
        <div class="model-selector-empty">
          <p>No models found</p>
        </div>
      `;
      footerCount.textContent = '0 models';
      return;
    }

    // Track expanded backend groups (initialize all as collapsed)
    if (!this.expandedBackends) {
      this.expandedBackends = new Set();
    }

    // Group models by backend
    const grouped = {};
    this.filteredModels.forEach(model => {
      if (!grouped[model.backend]) {
        grouped[model.backend] = {
          label: model.backendLabel,
          models: []
        };
      }
      grouped[model.backend].models.push(model);
    });

    // Render grouped list with collapsible headers
    let html = '';
    Object.keys(grouped).forEach(backendKey => {
      const group = grouped[backendKey];
      const isExpanded = this.expandedBackends.has(backendKey);
      const arrowIcon = isExpanded ? '▼' : '►';

      // Get company name from first model (all models in a backend should have same company)
      const companyName = group.models[0]?.company || '';
      const displayName = companyName ? `${group.label} (${companyName})` : group.label;

      html += `
        <div class="model-selector-group" data-backend="${this.escapeHtml(backendKey)}">
          <div class="model-selector-group-header" data-backend="${this.escapeHtml(backendKey)}" style="cursor: pointer;">
            <span class="group-toggle">${arrowIcon}</span>
            <span class="group-name">${this.escapeHtml(displayName)}</span>
            <span class="group-count">${group.models.length} model${group.models.length !== 1 ? 's' : ''}</span>
          </div>
          <div class="model-selector-group-items ${isExpanded ? '' : 'hidden'}">
      `;

      if (isExpanded) {
          group.models.forEach((model, index) => {
          const isSelected = this.selectedModel?.value === model.value;
          const isFocused = this.focusedIndex === this.filteredModels.indexOf(model);

          html += `
            <div
              class="model-selector-option ${isSelected ? 'selected' : ''} ${isFocused ? 'focused' : ''}"
              data-backend="${this.escapeHtml(model.backend)}"
              data-model="${this.escapeHtml(model.name)}"
              role="option"
              aria-selected="${isSelected}"
            >
              <div class="model-option-main">
                <div class="model-option-header">
                  <span class="model-option-name">${this.escapeHtml(model.name)}</span>
                  ${model.installed ?
                    '<span class="model-option-badge installed">Installed</span>' :
                    '<span class="model-option-badge not-installed">Not Installed</span>'
                  }
                </div>
                ${model.company ? `<div class="model-option-company">${this.escapeHtml(model.company)}</div>` : ''}
              </div>

              <div class="model-option-meta">
                <span class="meta-item">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                    <path d="M6 1a5 5 0 100 10A5 5 0 006 1zm0 9a4 4 0 110-8 4 4 0 010 8z"/>
                  </svg>
                  ${this.escapeHtml(model.size)}
                </span>
                <span class="meta-item">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                    <path d="M10 3H2v6h8V3zM1 2a1 1 0 011-1h8a1 1 0 011 1v8a1 1 0 01-1 1H2a1 1 0 01-1-1V2z"/>
                  </svg>
                  WER: ${this.escapeHtml(model.wer)}
                </span>
              </div>
            </div>
          `;
        });
      }

      html += `
          </div>
        </div>
      `;
    });

    listContainer.innerHTML = html;
    footerCount.textContent = `${this.filteredModels.length} model${this.filteredModels.length !== 1 ? 's' : ''}`;

    // Attach click handlers to backend group headers (for expand/collapse)
    const groupHeaders = listContainer.querySelectorAll('.model-selector-group-header');
    console.log('[ModelSelector] Attaching toggle handlers to', groupHeaders.length, 'backend groups');
    groupHeaders.forEach(header => {
      header.addEventListener('click', (e) => {
        e.stopPropagation();
        const backendKey = header.dataset.backend;
        console.log('[ModelSelector] Backend group clicked:', backendKey);
        this.toggleBackendGroup(backendKey);
      });
    });

    // Attach click handlers to model options
    const options = listContainer.querySelectorAll('.model-selector-option');
    console.log('[ModelSelector] Attaching click handlers to', options.length, 'options');
    options.forEach((option, index) => {
      option.addEventListener('click', (e) => {
        e.stopPropagation();
        const backend = option.dataset.backend;
        const modelName = option.dataset.model;
        console.log('[ModelSelector] Option clicked - backend:', backend, 'model:', modelName);
        this.selectOption(backend, modelName);
      });
    });
  }

  toggleBackendGroup(backendKey) {
    console.log('[ModelSelector] toggleBackendGroup called for:', backendKey);
    if (this.expandedBackends.has(backendKey)) {
      this.expandedBackends.delete(backendKey);
      console.log('[ModelSelector] Collapsed backend:', backendKey);
    } else {
      this.expandedBackends.add(backendKey);
      console.log('[ModelSelector] Expanded backend:', backendKey);
    }
    this.updateDropdownList();
  }

  attachEventListeners() {
    const trigger = this.container.querySelector('.model-selector-trigger');
    const dropdown = this.container.querySelector('.model-selector-dropdown');
    const searchInput = this.container.querySelector('.model-selector-search-input');

    if (!trigger) {
      console.error('[ModelSelector] Trigger button not found!');
      return;
    }

    console.log('[ModelSelector] Attaching click listener to trigger:', trigger);

    // Toggle dropdown
    trigger.addEventListener('click', (e) => {
      console.log('[ModelSelector] Trigger clicked!');
      e.stopPropagation();
      this.toggle();
    });

    // Search functionality
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.filterModels(e.target.value);
      });

      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          this.focusNext();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          this.focusPrevious();
        } else if (e.key === 'Enter' && this.focusedIndex >= 0) {
          e.preventDefault();
          const model = this.filteredModels[this.focusedIndex];
          this.selectOption(model.backend, model.name);
        } else if (e.key === 'Escape') {
          this.close();
        }
      });
    }

    // Keyboard navigation
    trigger.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.open();
      }
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!this.container.contains(e.target)) {
        this.close();
      }
    });

    // Close on escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  }

  filterModels(query) {
    const q = query.toLowerCase().trim();

    if (!q) {
      this.filteredModels = [...this.models];
    } else {
      this.filteredModels = this.models.filter(model =>
        model.name.toLowerCase().includes(q) ||
        model.backend.toLowerCase().includes(q) ||
        model.backendLabel.toLowerCase().includes(q) ||
        (model.company && model.company.toLowerCase().includes(q))
      );
    }

    this.focusedIndex = -1;
    this.updateDropdownList();
  }

  focusNext() {
    if (this.filteredModels.length === 0) return;

    this.focusedIndex = Math.min(this.focusedIndex + 1, this.filteredModels.length - 1);
    this.updateDropdownList();
    this.scrollToFocused();
  }

  focusPrevious() {
    if (this.filteredModels.length === 0) return;

    this.focusedIndex = Math.max(this.focusedIndex - 1, 0);
    this.updateDropdownList();
    this.scrollToFocused();
  }

  scrollToFocused() {
    const listContainer = this.container.querySelector('.model-selector-list');
    const focusedOption = listContainer.querySelector('.model-selector-option.focused');

    if (focusedOption) {
      focusedOption.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  selectOption(backend, modelName) {
    console.log('[ModelSelector] selectOption() called with backend:', backend, 'model:', modelName);
    const model = this.models.find(m => m.backend === backend && m.name === modelName);
    console.log('[ModelSelector] Found model:', model);

    if (model) {
      this.selectedModel = model;

      // Update trigger text
      const triggerValue = this.container.querySelector('.model-selector-value');
      triggerValue.innerHTML = `
        <span class="selected-model-name">${this.escapeHtml(model.name)}</span>
        <span class="selected-model-meta">${model.backendLabel} • ${model.size}</span>
      `;

      // Callback
      console.log('[ModelSelector] Calling onChange callback with:', {
        backend: model.backend,
        model: model.name,
        value: model.value
      });
      this.options.onChange({
        backend: model.backend,
        model: model.name,
        value: model.value,
        data: model
      });

      this.close();
    } else {
      console.error('[ModelSelector] No model found for backend:', backend, 'model:', modelName);
    }
  }

  open() {
    if (this.isOpen) return;

    this.isOpen = true;
    const dropdown = this.container.querySelector('.model-selector-dropdown');
    const trigger = this.container.querySelector('.model-selector-trigger');

    dropdown.classList.remove('hidden');
    trigger.setAttribute('aria-expanded', 'true');

    // Focus search input if available
    const searchInput = this.container.querySelector('.model-selector-search-input');
    if (searchInput) {
      setTimeout(() => searchInput.focus(), 100);
    }
  }

  close() {
    if (!this.isOpen) return;

    this.isOpen = false;
    const dropdown = this.container.querySelector('.model-selector-dropdown');
    const trigger = this.container.querySelector('.model-selector-trigger');

    dropdown.classList.add('hidden');
    trigger.setAttribute('aria-expanded', 'false');

    // Reset search
    const searchInput = this.container.querySelector('.model-selector-search-input');
    if (searchInput) {
      searchInput.value = '';
      this.filterModels('');
    }

    this.focusedIndex = -1;
  }

  toggle() {
    console.log('[ModelSelector] toggle() called, current state:', this.isOpen);
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  getValue() {
    return this.selectedModel ? this.selectedModel.value : '';
  }

  reset() {
    this.selectedModel = null;
    const triggerValue = this.container.querySelector('.model-selector-value');
    triggerValue.textContent = this.options.placeholder;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Export for use in main app
window.ModelSelector = ModelSelector;
