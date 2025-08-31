#!/bin/bash

# Script para testar deploy automático na Vercel
# Execute este script após verificar/corrigir o email da conta Vercel

echo "🔍 Verificando configuração atual do Git..."
echo "Nome: $(git config user.name)"
echo "Email: $(git config user.email)"
echo ""

echo "📝 Criando commit de teste..."
echo "# Deploy Test $(date)" >> DEPLOY_TEST.md
echo "Teste de deploy automático realizado em $(date)" >> DEPLOY_TEST.md
echo ""

echo "➕ Adicionando arquivos..."
git add DEPLOY_TEST.md
echo ""

echo "💾 Fazendo commit..."
git commit -m "test: Verificação de deploy automático - $(date +%H:%M:%S)"
echo ""

echo "🚀 Enviando para GitHub..."
git push origin main
echo ""

echo "✅ Commit enviado! Verifique na Vercel se o deploy foi iniciado."
echo "📱 Acesse: https://vercel.com/dashboard"
echo "🔍 Procure por um novo deployment na aba 'Deployments'"
echo ""
echo "⏱️  O deploy deve aparecer em 10-30 segundos."
echo "🤖 O Vercel Bot deve comentar no commit no GitHub."