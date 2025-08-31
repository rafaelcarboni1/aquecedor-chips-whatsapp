#!/bin/bash

# Script para testar Deploy Hook da Vercel
# Execute após configurar o Deploy Hook seguindo setup-deploy-hook.md

echo "🚀 Testando Deploy Hook da Vercel..."
echo "==========================================="
echo ""

# Verificar se há mudanças pendentes
if [[ -n $(git status --porcelain) ]]; then
    echo "⚠️  Há mudanças não commitadas. Fazendo commit primeiro..."
    git add .
    git commit -m "chore: Commit automático antes do teste de deploy hook"
fi

echo "📝 Criando arquivo de teste..."
TEST_FILE="DEPLOY_HOOK_TEST_$(date +%Y%m%d_%H%M%S).md"
echo "# Deploy Hook Test" > "$TEST_FILE"
echo "" >> "$TEST_FILE"
echo "Teste de Deploy Hook executado em: $(date)" >> "$TEST_FILE"
echo "Commit hash: $(git rev-parse HEAD)" >> "$TEST_FILE"
echo "Branch: $(git branch --show-current)" >> "$TEST_FILE"
echo "" >> "$TEST_FILE"
echo "Se você está vendo este arquivo na Vercel, o Deploy Hook está funcionando! ✅" >> "$TEST_FILE"

echo "➕ Adicionando arquivo de teste..."
git add "$TEST_FILE"

echo "💾 Fazendo commit..."
COMMIT_MSG="test: Deploy hook test - $(date +%H:%M:%S)"
git commit -m "$COMMIT_MSG"

echo "🔍 Informações do commit:"
echo "Hash: $(git rev-parse HEAD)"
echo "Mensagem: $COMMIT_MSG"
echo "Arquivo: $TEST_FILE"
echo ""

echo "🚀 Enviando para GitHub (isso deve triggerar o Deploy Hook)..."
git push origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Push realizado com sucesso!"
    echo ""
    echo "🔍 Verificações a fazer:"
    echo "1. GitHub Webhook:"
    echo "   - Acesse: https://github.com/rafaelcarboni1/aquecedor-chips-whatsapp/settings/hooks"
    echo "   - Clique no webhook da Vercel"
    echo "   - Vá em 'Recent Deliveries'"
    echo "   - Deve mostrar uma entrega com status 200"
    echo ""
    echo "2. Vercel Dashboard:"
    echo "   - Acesse: https://vercel.com/dashboard"
    echo "   - Vá no projeto aquecedor-chips-whatsapp"
    echo "   - Aba 'Deployments' deve mostrar novo deploy"
    echo "   - Status: Building → Ready"
    echo ""
    echo "3. Vercel Bot no GitHub:"
    echo "   - Acesse: https://github.com/rafaelcarboni1/aquecedor-chips-whatsapp/commits/main"
    echo "   - O último commit deve ter comentário do Vercel Bot"
    echo ""
    echo "⏱️  Aguarde 1-2 minutos para o deploy completar."
    echo ""
    echo "🎉 Se tudo funcionou, o problema de deploy está resolvido!"
else
    echo ""
    echo "❌ Erro no push. Verifique sua conexão e permissões."
    exit 1
fi