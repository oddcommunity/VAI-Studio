"""
Progress reporting utility for backend operations.
Outputs progress as JSON to stderr for IPC communication.
"""

import sys
import json


def report_progress(progress: float, message: str = '', stage: str = ''):
    """
    Report progress to the parent process via stderr.

    Args:
        progress: Progress percentage (0-100)
        message: Human-readable message
        stage: Current stage (e.g., 'downloading', 'processing', 'loading')
    """
    progress_data = {
        'type': 'progress',
        'progress': min(100, max(0, progress)),  # Clamp to 0-100
        'message': message,
        'stage': stage
    }

    # Output as JSON prefixed with PROGRESS: for easy parsing
    print(f"PROGRESS:{json.dumps(progress_data)}", file=sys.stderr, flush=True)


def report_download_progress(downloaded: int, total: int, filename: str = ''):
    """Report download progress."""
    if total > 0:
        progress = (downloaded / total) * 100
        mb_downloaded = downloaded / (1024 * 1024)
        mb_total = total / (1024 * 1024)
        message = f"Downloading {filename}: {mb_downloaded:.1f}/{mb_total:.1f} MB"
        report_progress(progress, message, 'downloading')


def report_processing_progress(current: int, total: int, item_name: str = ''):
    """Report processing progress (e.g., chunks, files)."""
    if total > 0:
        progress = (current / total) * 100
        message = f"Processing {item_name}: {current}/{total}"
        report_progress(progress, message, 'processing')
