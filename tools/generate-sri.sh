#!/usr/bin/env bash
# Prints <script>/<link> tags with Subresource Integrity (SRI) hashes for the CDN files used by index.html.
# SRI makes the browser refuse a CDN file if it was ever tampered with.
# Usage:  bash tools/generate-sri.sh        (needs curl + openssl; run on your own machine)
# Then replace the matching tags in index.html with the printed ones.
set -euo pipefail

JS=(
  "https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js"
  "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth-compat.js"
  "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore-compat.js"
  "https://cdn.jsdelivr.net/npm/flatpickr@4.6.13/dist/flatpickr.min.js"
  "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"
)
CSS=("https://cdn.jsdelivr.net/npm/flatpickr@4.6.13/dist/flatpickr.min.css")

hash() { curl -fsSL "$1" | openssl dgst -sha384 -binary | openssl base64 -A; }

for u in "${JS[@]}"; do
  echo "<script src=\"$u\" integrity=\"sha384-$(hash "$u")\" crossorigin=\"anonymous\"></script>"
done
for u in "${CSS[@]}"; do
  echo "<link rel=\"stylesheet\" href=\"$u\" integrity=\"sha384-$(hash "$u")\" crossorigin=\"anonymous\">"
done
