#!/bin/bash
set -e

SOURCE_DIR="/home/nour/Documents/Obsidian/cmd_hero_fights"
DEST_DIR="/home/nour/Projects/cmd-hero-fights-demo/content"

# Check source
[ -d "$SOURCE_DIR" ] || { echo "Source missing"; exit 1; }

# Ensure dest exists
mkdir -p "$DEST_DIR"

# If already mounted → unmount first
if mountpoint -q "$DEST_DIR"; then
  echo "Unmounting existing mount..."
  sudo umount "$DEST_DIR"
fi

# Bind mount
sudo mount --bind "$SOURCE_DIR" "$DEST_DIR"

# IMPORTANT: make it readonly properly
sudo mount -o remount,bind,ro "$DEST_DIR"

echo "Mounted read-only successfully"