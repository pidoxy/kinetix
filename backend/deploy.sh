#!/bin/bash

# Kinetix Backend Railway Deployment Script

set -e  # Exit on error

echo "🚀 Kinetix Backend Railway Deployment"
echo "======================================"

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Install it with:"
    echo "   npm install -g @railway/cli"
    exit 1
fi

# Check if logged in
echo "📝 Checking Railway authentication..."
if ! railway whoami &> /dev/null; then
    echo "❌ Not logged in to Railway. Please run:"
    echo "   railway login"
    exit 1
fi

echo "✅ Authenticated"

# Check if linked to a project
echo "🔗 Checking Railway project link..."
if ! railway status &> /dev/null 2>&1; then
    echo "⚠️  Not linked to a Railway project."
    echo "   Please run: railway link"
    echo "   Or create new: railway init"
    exit 1
fi

echo "✅ Project linked"

# Check for GEMINI_API_KEY in .env
if [ -f .env ]; then
    echo "🔑 Found .env file"
    if grep -q "GEMINI_API_KEY" .env; then
        echo "✅ GEMINI_API_KEY found in .env"

        # Ask if user wants to sync to Railway
        echo ""
        echo "⚠️  IMPORTANT: You need to set GEMINI_API_KEY in Railway"
        echo "   Would you like to set it now? (You'll need to paste your key)"
        echo ""
        echo "   Run this command manually:"
        echo "   railway variables --set GEMINI_API_KEY=your_key_here"
        echo ""
    else
        echo "⚠️  GEMINI_API_KEY not found in .env"
    fi
else
    echo "⚠️  No .env file found"
fi

# Check requirements.txt
echo "📦 Checking dependencies..."
if [ ! -f requirements.txt ]; then
    echo "❌ requirements.txt not found!"
    exit 1
fi
echo "✅ requirements.txt found"

# Check main.py
echo "🐍 Checking main.py..."
if [ ! -f main.py ]; then
    echo "❌ main.py not found!"
    exit 1
fi
echo "✅ main.py found"

# Verify PORT configuration
if grep -q 'os.getenv("PORT"' main.py; then
    echo "✅ PORT configuration looks good"
else
    echo "⚠️  PORT may not be configured correctly"
fi

echo ""
echo "======================================"
echo "🎯 Ready to deploy!"
echo ""
echo "Next steps:"
echo "1. Set GEMINI_API_KEY in Railway:"
echo "   railway variables --set GEMINI_API_KEY=your_key"
echo ""
echo "2. Deploy:"
echo "   railway up"
echo ""
echo "3. Get your URL:"
echo "   railway domain"
echo ""
echo "======================================"
echo ""

read -p "Do you want to deploy now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 Deploying to Railway..."
    railway up

    echo ""
    echo "✅ Deployment complete!"
    echo ""
    echo "📊 View logs: railway logs"
    echo "🌐 Get URL: railway domain"
    echo "📈 Check status: railway status"
else
    echo "Deployment cancelled. Run 'railway up' when ready."
fi
