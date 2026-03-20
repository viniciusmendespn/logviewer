#!/bin/bash
echo "=== Atualizando Log Viewer ==="

git pull origin master || { echo "Erro ao atualizar."; exit 1; }

echo ""
echo "Atualizado com sucesso! Reinicie com ./start.sh para aplicar as mudanças."
