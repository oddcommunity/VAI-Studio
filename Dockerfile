# LocalVoice AI - Development Docker Environment
FROM node:18-bullseye

# Install Python 3.9+ and system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    ffmpeg \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    git \
    curl \
    wget \
    && rm -rf /var/lib/apt/lists/*

# For Electron GUI (X11 forwarding support)
RUN apt-get update && apt-get install -y \
    libgtk-3-0 \
    libnotify-dev \
    libgconf-2-4 \
    libnss3 \
    libxss1 \
    libasound2 \
    libxtst6 \
    xauth \
    xvfb \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install Node dependencies
RUN npm install

# Copy backend requirements
COPY backends/requirements.txt ./backends/

# Create Python virtual environment and install core dependencies
RUN python3 -m venv /app/venv && \
    . /app/venv/bin/activate && \
    pip install --upgrade pip && \
    pip install openai-whisper && \
    pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu && \
    pip install transformers && \
    pip install librosa soundfile ffmpeg-python numpy scipy

# Copy application code
COPY . .

# Set environment variables
ENV DISPLAY=:99
ENV ELECTRON_DISABLE_SANDBOX=1
ENV NODE_ENV=development

# Expose any ports if needed (for debugging)
EXPOSE 9229

# Default command - start Electron in dev mode
CMD ["npm", "run", "dev"]
