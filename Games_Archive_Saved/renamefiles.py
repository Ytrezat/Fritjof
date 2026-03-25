#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Created on Wed Mar 25 10:26:24 2026

@author: thibault
"""

import os
import re
from pathlib import Path

# ====== CONFIG ======
# Change this to your folder containing the .txt files
FOLDER = Path(".")   # current folder
# ====================


def sanitize_name(name: str) -> str:
    """
    Keep filenames safe: remove problematic chars, normalize spaces.
    """
    name = name.strip()
    name = re.sub(r'[<>:"/\\|?*]', '', name)
    name = re.sub(r'\s+', '', name)  # remove spaces inside names
    return name


def extract_player(line: str, label: str) -> str:
    """
    Extract player name from lines like:
    White:  Casshern, Los Angeles, USA
    Black:  Draganov, Sofia, Bulgaria
    Assumes player name is the first comma-separated field after the label.
    """
    m = re.match(rf'^{label}:\s*(.+)$', line.strip(), re.IGNORECASE)
    if not m:
        return None
    content = m.group(1).strip()
    # Take everything before first comma as player name
    player = content.split(",")[0].strip()
    return sanitize_name(player)


def extract_event_code(event_line: str) -> str:
    """
    Convert:
    'Event: WTF World Championship Tournament 2025'
    -> 'WTF2025'

    Strategy:
    - take text after 'Event:'
    - use first uppercase token as event code if present
    - append 4-digit year if present
    """
    m = re.match(r'^Event:\s*(.+)$', event_line.strip(), re.IGNORECASE)
    if not m:
        return "EVENT"

    event_text = m.group(1).strip()

    # Find first all-caps token like WTF
    code_match = re.search(r'\b([A-Z]{2,})\b', event_text)
    code = code_match.group(1) if code_match else None

    # Find year
    year_match = re.search(r'\b(20\d{2}|19\d{2})\b', event_text)
    year = year_match.group(1) if year_match else ""

    if code and year:
        return f"{code}{year}"
    elif code:
        return code
    elif year:
        return f"EVENT{year}"
    else:
        # fallback: initials of words
        words = re.findall(r'[A-Za-z]+', event_text)
        initials = ''.join(w[0].upper() for w in words[:4]) or "EVENT"
        return initials


def extract_result(text: str) -> str:
    """
    Return:
    B = black won
    W = white won
    D = draw
    """
    if re.search(r'\bBlack won\.', text, re.IGNORECASE):
        return "B"
    if re.search(r'\bWhite won\.', text, re.IGNORECASE):
        return "W"
    if re.search(r'\bDraw\.', text, re.IGNORECASE):
        return "D"
    return "U"  # unknown


def extract_datetime(text: str):
    """
    Find line like:
    2025-11-12 11:49:38 (Copenhagen time)

    Return:
    date = 2025-11-12
    time = 114938
    """
    m = re.search(r'(\d{4}-\d{2}-\d{2})\s+(\d{2}):(\d{2}):(\d{2})', text)
    if not m:
        return None, None

    date_part = m.group(1)
    time_part = f"{m.group(2)}{m.group(3)}{m.group(4)}"
    return date_part, time_part


def parse_file(filepath: Path):
    text = filepath.read_text(encoding="utf-8", errors="replace")
    lines = text.splitlines()

    event_line = None
    white = None
    black = None

    for line in lines:
        if event_line is None and line.strip().lower().startswith("event:"):
            event_line = line
        if white is None and line.strip().lower().startswith("white:"):
            white = extract_player(line, "White")
        if black is None and line.strip().lower().startswith("black:"):
            black = extract_player(line, "Black")

    event_code = extract_event_code(event_line) if event_line else "EVENT"
    result = extract_result(text)
    date_part, time_part = extract_datetime(text)

    if not white or not black or not date_part or not time_part:
        raise ValueError("Missing required fields")

    new_name = f"{white}-{black}_{event_code}{date_part}_{time_part}_{result}.txt"
    return new_name


def main():
    txt_files = sorted(FOLDER.glob("*.txt"))

    if not txt_files:
        print("No .txt files found.")
        return

    for filepath in txt_files:
        try:
            new_name = parse_file(filepath)
            new_path = filepath.with_name(new_name)

            # Avoid overwriting existing files
            if new_path.exists():
                print(f"SKIP (target exists): {filepath.name} -> {new_name}")
                continue

            filepath.rename(new_path)
            print(f"RENAMED: {filepath.name} -> {new_name}")

        except Exception as e:
            print(f"ERROR: {filepath.name}: {e}")


if __name__ == "__main__":
    main()