#!/bin/bash

# Script para inicializar Evolution API e executar testes
# Autor: Sistema de Migração Baileys -> Evolution API

set -e  # Sair em caso de erro

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log colorido
log() {
    local color=$1
    local message=$2
    echo -e "${color}[$(date +'%Y-%m-%d %H:%M:%S')] ${message}${NC}"
}

# Função para verificar se Docker está rodando
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        log $RED "❌ Docker não está rodando. Por favor, inicie o Docker Desktop."
        exit 1
    fi
    log $GREEN "✅ Docker está rodando"
}

# Função para verificar se as portas estão livres
check_ports() {
    local ports=("8080" "5432" "6379")
    
    for port in "${ports[@]}"; do
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            log $YELLOW "⚠️  Porta $port está em uso. Tentando parar processos..."
            
            # Tentar parar containers Docker que podem estar usando as portas
            docker-compose -f docker-compose.evolution.yml down 2>/dev/null || true
            
            # Verificar novamente
            if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
                log $RED "❌ Porta $port ainda está em uso. Por favor, libere a porta manualmente."
                log $YELLOW "   Comando para verificar: lsof -i :$port"
                exit 1
            fi
        fi
    done
    log $GREEN "✅ Todas as portas necessárias estão livres"
}

# Função para iniciar Evolution API
start_evolution() {
    log $BLUE "🚀 Iniciando Evolution API com Docker Compose..."
    
    # Parar containers existentes
    docker-compose -f docker-compose.evolution.yml down 2>/dev/null || true
    
    # Iniciar containers
    docker-compose -f docker-compose.evolution.yml up -d
    
    log $YELLOW "⏳ Aguardando Evolution API inicializar..."
    
    # Aguardar até a API estar disponível (máximo 2 minutos)
    local max_attempts=24
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f http://localhost:8080/instance/fetchInstances > /dev/null 2>&1; then
            log $GREEN "✅ Evolution API está rodando e respondendo!"
            return 0
        fi
        
        log $YELLOW "   Tentativa $attempt/$max_attempts - Aguardando API..."
        sleep 5
        ((attempt++))
    done
    
    log $RED "❌ Evolution API não respondeu após 2 minutos"
    log $YELLOW "📋 Logs dos containers:"
    docker-compose -f docker-compose.evolution.yml logs --tail=20
    return 1
}

# Função para executar testes
run_tests() {
    log $BLUE "🧪 Executando testes da Evolution API..."
    
    if node test-evolution-complete.js; then
        log $GREEN "✅ Testes concluídos com sucesso!"
        return 0
    else
        log $RED "❌ Alguns testes falharam"
        return 1
    fi
}

# Função para mostrar status dos containers
show_status() {
    log $BLUE "📊 Status dos containers:"
    docker-compose -f docker-compose.evolution.yml ps
    
    echo ""
    log $BLUE "🌐 URLs disponíveis:"
    echo "   Evolution API: http://localhost:8080"
    echo "   PostgreSQL: localhost:5432 (user: postgres, pass: evolution123)"
    echo "   Redis: localhost:6379"
    
    echo ""
    log $BLUE "📚 Comandos úteis:"
    echo "   Ver logs: docker-compose -f docker-compose.evolution.yml logs -f"
    echo "   Parar: docker-compose -f docker-compose.evolution.yml down"
    echo "   Reiniciar: docker-compose -f docker-compose.evolution.yml restart"
    echo "   Executar testes: node test-evolution-complete.js"
}

# Função para limpeza
cleanup() {
    log $YELLOW "🧹 Limpando recursos..."
    docker-compose -f docker-compose.evolution.yml down
    log $GREEN "✅ Limpeza concluída"
}

# Função principal
main() {
    echo "="*60
    log $BLUE "🚀 EVOLUTION API - SETUP E TESTES"
    echo "="*60
    
    # Verificações iniciais
    check_docker
    check_ports
    
    # Iniciar Evolution API
    if start_evolution; then
        show_status
        
        echo ""
        read -p "Deseja executar os testes agora? (y/n): " -n 1 -r
        echo ""
        
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            run_tests
        else
            log $YELLOW "⏭️  Testes pulados. Execute manualmente: node test-evolution-complete.js"
        fi
        
        echo ""
        log $GREEN "🎉 Evolution API está rodando!"
        log $BLUE "💡 Para parar: docker-compose -f docker-compose.evolution.yml down"
        
    else
        log $RED "❌ Falha ao iniciar Evolution API"
        cleanup
        exit 1
    fi
}

# Capturar Ctrl+C para limpeza
trap cleanup EXIT

# Verificar argumentos
case "${1:-}" in
    "start")
        main
        ;;
    "stop")
        cleanup
        ;;
    "test")
        run_tests
        ;;
    "status")
        show_status
        ;;
    "logs")
        docker-compose -f docker-compose.evolution.yml logs -f
        ;;
    *)
        echo "Uso: $0 {start|stop|test|status|logs}"
        echo ""
        echo "Comandos:"
        echo "  start  - Inicia Evolution API e oferece executar testes"
        echo "  stop   - Para todos os containers"
        echo "  test   - Executa apenas os testes"
        echo "  status - Mostra status dos containers"
        echo "  logs   - Mostra logs em tempo real"
        echo ""
        echo "Exemplo: $0 start"
        exit 1
        ;;
esac