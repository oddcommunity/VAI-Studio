# X11 Forwarding Setup for LocalVoice AI Docker GUI

This guide will help you see the Electron GUI while running in Docker, keeping everything isolated from your other projects.

## Why X11 Forwarding?

✅ **Keeps everything isolated** - All dependencies stay in Docker
✅ **No conflicts** - Won't affect other projects on your Mac
✅ **Full GUI access** - See the Electron app interface
✅ **Easy cleanup** - Remove Docker container when done

## Step 1: Install XQuartz

XQuartz is the X11 server for macOS that allows GUI apps from Docker to display on your Mac.

### Option A: Install via Homebrew (Recommended)

```bash
brew install --cask xquartz
```

### Option B: Manual Download

1. Download from: https://www.xquartz.org/
2. Open the downloaded `.dmg` file
3. Run the installer
4. Follow installation prompts

**Note**: After installation, you'll need to **log out and log back in** to your Mac for XQuartz to work properly.

## Step 2: Configure XQuartz

After logging back in:

1. **Open XQuartz**:
   ```bash
   open -a XQuartz
   ```

2. **Configure Security Settings**:
   - XQuartz menu → Preferences → Security tab
   - ✅ Check "Allow connections from network clients"
   - Close and reopen XQuartz

3. **Allow localhost connections**:
   ```bash
   xhost +localhost
   ```

   You should see: `localhost being added to access control list`

## Step 3: Set Display Variable

```bash
# Get your IP address
export DISPLAY_IP=$(ifconfig en0 | grep inet | awk '$1=="inet" {print $2}')
export DISPLAY=$DISPLAY_IP:0

# Verify it's set
echo $DISPLAY
```

## Step 4: Run LocalVoice AI with GUI

Now run the Docker container with GUI support:

```bash
# Stop current Docker container
docker-compose down

# Run with X11 forwarding
docker-compose run --rm \
  -e DISPLAY=$DISPLAY \
  -v /tmp/.X11-unix:/tmp/.X11-unix \
  localvoice-dev
```

## Alternative: Simple Script

I'll create a helper script to make this easier.

## Troubleshooting

### Issue: "Can't open display"

**Solution**: Make sure XQuartz is running and DISPLAY is set:
```bash
open -a XQuartz
export DISPLAY=$(ifconfig en0 | grep inet | awk '$1=="inet" {print $2}'):0
```

### Issue: "Connection refused"

**Solution**: Allow localhost:
```bash
xhost +localhost
```

### Issue: Black window or no display

**Solution**: Try using host.docker.internal:
```bash
export DISPLAY=host.docker.internal:0
```

### Issue: XQuartz crashes

**Solution**: Restart XQuartz:
```bash
killall XQuartz
open -a XQuartz
```

## Simpler Alternative: Run Locally

If X11 forwarding doesn't work well, you can run locally but install Python dependencies in a virtual environment to keep things isolated:

```bash
# Create Python virtual environment
cd /Users/exeai/Projects/localvoiceAI
python3 -m venv venv_local
source venv_local/bin/activate

# Install Python dependencies
pip install openai-whisper torch transformers librosa soundfile ffmpeg-python

# Run the app (uses local Node.js but isolated Python)
npm run dev
```

This way:
- ✅ Node.js/Electron runs natively (full GUI)
- ✅ Python deps are isolated in `venv_local/`
- ✅ Won't affect other projects
- ✅ Easy to delete: `rm -rf venv_local/`

## What I Recommend

**For GUI testing**: Use the "Simpler Alternative" above (local Electron + isolated Python venv)

**For backend testing**: Keep using Docker as you have been

**Why?**:
- Electron GUIs work best natively on macOS
- X11 forwarding can be slow/glitchy for complex UIs
- Python venv gives you isolation without Docker complexity for GUI

## Quick Start Script (Coming Next)

I'll create a `run-local.sh` script that:
1. Sets up the Python venv automatically
2. Installs dependencies
3. Launches the app
4. Keeps everything isolated

Would you like me to create that script?
