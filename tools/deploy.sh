#!/usr/bin/env bash
# Deploy script for EPUB book publishing
# Uses SSH keys from config/ssh_keys.yml

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CONFIG_DIR="$ROOT_DIR/config"
AUTHORIZED_KEYS="$CONFIG_DIR/authorized_keys"

echo "=== EPUB Publishing Deployment ==="
echo "Root directory: $ROOT_DIR"
echo "Config directory: $CONFIG_DIR"

# Verify SSH keys are configured
if [[ -f "$AUTHORIZED_KEYS" ]]; then
    echo "✓ SSH keys found in $AUTHORIZED_KEYS"
    KEY_COUNT=$(grep -c "^ssh-" "$AUTHORIZED_KEYS" || echo "0")
    echo "  → $KEY_COUNT SSH keys configured"
else
    echo "⚠ No SSH keys found at $AUTHORIZED_KEYS"
    echo "  Please add SSH public keys for deployment authentication"
    exit 1
fi

# Display configured keys (public information only)
echo ""
echo "Configured SSH Keys:"
while IFS= read -r line; do
    if [[ $line =~ ^ssh- ]]; then
        KEY_TYPE=$(echo "$line" | cut -d' ' -f1)
        COMMENT=$(echo "$line" | cut -d' ' -f3-)
        echo "  → $KEY_TYPE key: $COMMENT"
    elif [[ $line =~ ^#.*iPhone ]]; then
        echo "  $line"
    fi
done < "$AUTHORIZED_KEYS"

echo ""
echo "✓ SSH key verification complete"
echo "Ready for deployment operations"