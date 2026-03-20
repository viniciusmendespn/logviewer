#!/bin/bash
echo "=== Log Viewer - Banco Hyundai ==="

mkdir -p logs

if [ ! -d ".venv" ]; then
    echo "Criando ambiente virtual..."
    python3 -m venv .venv
fi

source .venv/bin/activate
pip install -q -r requirements.txt

echo ""
echo "Iniciando servidor em http://localhost:5000"
echo "Pressione Ctrl+C para parar."
echo ""

# Abre o browser (macOS e Linux)
(sleep 1 && (open http://localhost:5000 2>/dev/null || xdg-open http://localhost:5000 2>/dev/null)) &

python server.py
