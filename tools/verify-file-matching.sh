#!/bin/bash
# verify-file-matching.sh - Check if OEBPS/chapters files match OEBPS/complete files

cd "$(dirname "$0")/.."

echo "=== OEBPS File Matching Verification ==="
echo

ALL_MATCH=true
TOTAL_FILES=0
MATCHING_FILES=0

for file in OEBPS/chapters/*.xhtml; do
  if [[ -f "$file" ]]; then
    basename=$(basename "$file")
    TOTAL_FILES=$((TOTAL_FILES + 1))
    
    if [[ -f "OEBPS/complete/$basename" ]]; then
      if diff -q "$file" "OEBPS/complete/$basename" >/dev/null 2>&1; then
        echo "✅ Matches: $basename"
        MATCHING_FILES=$((MATCHING_FILES + 1))
      else
        echo "❌ Different: $basename"
        ALL_MATCH=false
      fi
    else
      echo "❌ Missing in complete/: $basename"
      ALL_MATCH=false
    fi
  fi
done

echo
echo "=== Summary ==="
echo "Total files checked: $TOTAL_FILES"
echo "Matching files: $MATCHING_FILES"

if [[ "$ALL_MATCH" == "true" ]]; then
  echo "🎉 SUCCESS: All files match between OEBPS/chapters/ and OEBPS/complete/"
  exit 0
else
  echo "⚠️  ISSUE: Some files do not match or are missing"
  exit 1
fi