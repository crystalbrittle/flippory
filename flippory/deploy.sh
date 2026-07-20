#!/usr/bin/env bash
#
# Usage: ./deploy.sh [DESTINATION_PATH]
#
# Deploys the project via rsync over SSH.

# Set the base source directory to where this script is located
SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Default destination path (SSH)
# Typically: username@hostname:/path/to/destination/
DEFAULT_DEST="marstr61@bludgeonsoft.org:/home/marstr61/bludgeonsoft.org/flippory/"

DEST_PATH="${1:-$DEFAULT_DEST}"

# Ensure trailing slashes for rsync so it syncs folder contents, not the folder itself
SRC="${SRC_DIR}/"
if [[ "${DEST_PATH}" != */ ]]; then
  DEST_PATH="${DEST_PATH}/"
fi

echo "Source:      $SRC"
echo "Destination: $DEST_PATH"
echo ""

# Use rsync over SSH to transfer files
rsync -avv --update \
  --exclude="/.git" \
  --exclude="/.DS_Store" \
  --exclude="/deploy.sh" \
  --exclude="/flippory.code-workspace" \
  "$SRC" "$DEST_PATH"

echo "Done."
