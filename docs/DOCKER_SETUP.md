# LocalVoice AI - Docker Development Environment

This guide explains how to use Docker to test and develop LocalVoice AI in an isolated environment without affecting your other projects.

## Why Docker?

- **Isolation**: Keep all dependencies (Node.js, Python, libraries) contained
- **Consistency**: Same environment across different machines
- **Clean**: No conflicts with other projects on your system
- **Easy cleanup**: Remove everything with one command

## Prerequisites

1. **Docker Desktop** (required)
   - macOS: Download from [docker.com](https://www.docker.com/products/docker-desktop)
   - Or install via Homebrew: `brew install --cask docker`

2. **Docker Compose** (included with Docker Desktop)

## Quick Start

### 1. Test the Docker Environment

Run the automated test script:

```bash
chmod +x test-docker.sh
./test-docker.sh
```

This will:
- Check Docker installation
- Build the Docker image
- Test Python backends
- Test Node.js environment
- Verify all dependencies

### 2. Run Development Environment

```bash
# Start the development container
docker-compose up localvoice-dev

# Or run in detached mode (background)
docker-compose up -d localvoice-dev

# View logs
docker-compose logs -f localvoice-dev
```

### 3. Run Headless Backend Tests

```bash
# Test backend listing
docker-compose run --rm localvoice-test

# List all backends
docker-compose run --rm localvoice-test \
  /bin/bash -c ". /app/venv/bin/activate && python3 backends/runner.py list-backends"

# List Whisper models
docker-compose run --rm localvoice-test \
  /bin/bash -c ". /app/venv/bin/activate && python3 backends/runner.py list-models whisper"
```

## Docker Services

### `localvoice-dev`
Full development environment with Electron GUI support.

**Features**:
- Live code reloading (mounts source directories)
- Xvfb for headless GUI testing
- Node.js and Python environments
- All dependencies pre-installed

**Usage**:
```bash
docker-compose up localvoice-dev
```

### `localvoice-test`
Lightweight headless testing for backends only.

**Features**:
- Python environment with all backends
- No GUI components
- Fast startup
- Ideal for CI/CD

**Usage**:
```bash
docker-compose run --rm localvoice-test <command>
```

## Development Workflow

### Live Development with Code Changes

The Docker container mounts these directories for live development:
- `./src` - Frontend code
- `./electron` - Electron main process
- `./backends` - Python backends

**Changes to these files are immediately reflected in the running container.**

### Install Additional Python Packages

```bash
# Enter the container
docker-compose exec localvoice-dev bash

# Activate virtual environment
. /app/venv/bin/activate

# Install package
pip install <package-name>

# Exit container
exit
```

To persist changes, update `backends/requirements.txt` and rebuild:
```bash
docker-compose build localvoice-dev
```

### Install Additional npm Packages

```bash
# Enter the container
docker-compose exec localvoice-dev bash

# Install package
npm install <package-name>

# Exit container
exit
```

To persist changes, rebuild:
```bash
docker-compose build localvoice-dev
```

## Testing Specific Components

### Test Python Backend Directly

```bash
# Enter container shell
docker-compose run --rm localvoice-test bash

# Inside container
. /app/venv/bin/activate
python3 backends/runner.py list-backends
python3 backends/runner.py list-models whisper
```

### Test Electron App (Headless)

```bash
docker-compose run --rm localvoice-dev npm start
```

### Interactive Shell for Debugging

```bash
# Bash shell in dev container
docker-compose run --rm localvoice-dev bash

# Python shell with backends loaded
docker-compose run --rm localvoice-test bash
. /app/venv/bin/activate
python3
>>> from whisper_backend import WhisperBackend
>>> backend = WhisperBackend()
>>> backend.list_models()
```

## GUI Testing on macOS

Docker doesn't natively support GUI apps, but you can use X11 forwarding:

### Setup (One-time)

1. Install XQuartz:
   ```bash
   brew install --cask xquartz
   ```

2. Open XQuartz and configure:
   - XQuartz → Preferences → Security
   - Check "Allow connections from network clients"
   - Restart XQuartz

3. Allow Docker to connect:
   ```bash
   xhost +localhost
   ```

### Run with GUI

```bash
DISPLAY=host.docker.internal:0 docker-compose up localvoice-dev
```

**Note**: GUI support in Docker is experimental and may not work perfectly. For full GUI testing, consider running locally or using the built app.

## Docker Commands Reference

### Build

```bash
# Build all services
docker-compose build

# Build specific service
docker-compose build localvoice-dev

# Rebuild without cache
docker-compose build --no-cache
```

### Run

```bash
# Start service (foreground)
docker-compose up localvoice-dev

# Start service (background)
docker-compose up -d localvoice-dev

# Run one-off command
docker-compose run --rm localvoice-test <command>

# Run interactive shell
docker-compose run --rm localvoice-dev bash
```

### Stop/Clean

```bash
# Stop running containers
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v

# Remove all LocalVoice AI containers and images
docker-compose down --rmi all -v
```

### Logs

```bash
# View logs (all services)
docker-compose logs

# View logs (specific service)
docker-compose logs localvoice-dev

# Follow logs (real-time)
docker-compose logs -f localvoice-dev
```

### Inspect

```bash
# List running containers
docker-compose ps

# List all containers (including stopped)
docker-compose ps -a

# View container resource usage
docker stats
```

## Troubleshooting

### Issue: Docker daemon not running

**Error**: `Cannot connect to the Docker daemon`

**Solution**: Start Docker Desktop application

### Issue: Port already in use

**Error**: `Port 9229 is already allocated`

**Solution**: Stop other containers using the port or change port in `docker-compose.yml`

### Issue: Out of disk space

**Error**: `no space left on device`

**Solution**: Clean up Docker:
```bash
docker system prune -a --volumes
```

### Issue: Python packages not found

**Error**: `ModuleNotFoundError: No module named 'whisper'`

**Solution**: Rebuild container to install dependencies:
```bash
docker-compose build --no-cache localvoice-dev
```

### Issue: Permission denied errors

**Solution**: Some files may need to be executable:
```bash
chmod +x test-docker.sh
chmod +x backends/runner.py
```

### Issue: Changes not reflected

If you edit files but don't see changes in the container:

1. Check volume mounts in `docker-compose.yml`
2. Restart the container:
   ```bash
   docker-compose restart localvoice-dev
   ```
3. Rebuild if you changed dependencies:
   ```bash
   docker-compose build localvoice-dev
   ```

## Performance Tips

### Speed Up Builds

Use BuildKit for faster builds:
```bash
DOCKER_BUILDKIT=1 docker-compose build
```

### Reduce Image Size

The image includes only necessary files via `.dockerignore`. To further reduce:

1. Remove unused backends from `Dockerfile`
2. Use multi-stage builds (advanced)
3. Don't install development tools

### Faster Startup

Use the test service for backend-only testing:
```bash
# Faster than full dev environment
docker-compose run --rm localvoice-test <command>
```

## CI/CD Integration

Use the Docker setup in GitHub Actions:

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build Docker image
        run: docker-compose build localvoice-test
      - name: Test backends
        run: docker-compose run --rm localvoice-test /bin/bash -c ". /app/venv/bin/activate && python3 backends/runner.py list-backends"
```

## Clean Up

### Remove Everything

```bash
# Stop and remove all containers, networks, volumes
docker-compose down -v

# Remove Docker images
docker-compose down --rmi all -v

# Prune all unused Docker resources
docker system prune -a --volumes
```

### Keep Docker Clean

Run periodically:
```bash
# Remove stopped containers
docker container prune

# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune
```

## Comparison: Docker vs Local

| Aspect | Docker | Local Install |
|--------|--------|---------------|
| **Setup Time** | 5-10 min (first time) | 15-30 min |
| **Isolation** | Complete | Shared with system |
| **Disk Space** | ~5GB (image + volumes) | ~2GB |
| **Performance** | 90-95% native | 100% native |
| **GUI Support** | Limited (X11 forwarding) | Full native |
| **Cleanup** | One command | Manual uninstall |
| **Reproducibility** | Guaranteed same environment | May vary by system |

**Recommendation**:
- Use **Docker** for: Testing, CI/CD, isolated development
- Use **Local** for: Full GUI development, production builds

## Next Steps

1. Run `./test-docker.sh` to verify setup
2. Test backend functionality:
   ```bash
   docker-compose run --rm localvoice-test
   ```
3. For development, start the dev service:
   ```bash
   docker-compose up localvoice-dev
   ```
4. When done, clean up:
   ```bash
   docker-compose down
   ```

## Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Electron in Docker](https://github.com/electron/electron/issues/228)
- [LocalVoice AI Main README](README.md)

---

**Questions or Issues?**

Open an issue on GitHub or check the [troubleshooting section](#troubleshooting) above.
