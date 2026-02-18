#!/bin/bash
# Deploy Firebase Functions Script
# Usage: ./deploy-functions.sh

set -e

echo "🚀 Firebase Functions Deployment Script"
echo "=========================================="
echo ""

# Check if we're in Codespace
if [ -z "$CODESPACES" ]; then
  echo "⚠️  Warning: This script is designed for GitHub Codespaces"
  echo "   It may work locally if you have firebase-tools installed"
  echo ""
fi

# Check for firebase.json
if [ ! -f "firebase.json" ]; then
  echo "❌ Error: firebase.json not found"
  echo "   Are you in the project root directory?"
  exit 1
fi

# Check for functions directory
if [ ! -d "functions" ]; then
  echo "❌ Error: functions directory not found"
  exit 1
fi

echo "📦 Installing Firebase CLI..."
npm install -g firebase-tools 2>/dev/null || true
echo "✅ Firebase CLI ready"
echo ""

echo "📦 Installing function dependencies..."
cd functions
npm install
cd ..
echo "✅ Dependencies installed"
echo ""

# Check if service account is set
if [ -n "$GOOGLE_APPLICATION_CREDENTIALS" ] && [ -f "$GOOGLE_APPLICATION_CREDENTIALS" ]; then
  echo "🔐 Using service account from: $GOOGLE_APPLICATION_CREDENTIALS"
  echo ""
  echo "🚀 Deploying functions..."
  firebase deploy --only functions --project pwa-messenger-oliver
  echo ""
  echo "✅ Deploy complete!"
else
  echo "⚠️  No service account found."
  echo ""
  echo "Please follow these steps:"
  echo ""
  echo "1. Download service account key from:"
  echo "   https://console.cloud.google.com/iam-admin/serviceaccounts?project=pwa-messenger-oliver"
  echo ""
  echo "2. Upload the JSON file to Codespace (drag & drop into file explorer)"
  echo ""
  echo "3. Set environment variable:"
  echo "   export GOOGLE_APPLICATION_CREDENTIALS='/workspaces/PWA-Messenger/service-account.json'"
  echo ""
  echo "4. Run this script again: ./deploy-functions.sh"
  echo ""
  echo "OR use Firebase login:"
  echo "   firebase login --no-localhost"
  echo "   Then run: firebase deploy --only functions --project pwa-messenger-oliver"
fi
