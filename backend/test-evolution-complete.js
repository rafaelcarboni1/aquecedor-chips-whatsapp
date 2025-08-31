#!/usr/bin/env node

const { EvolutionApiService } = require('./services/EvolutionApiService');
const axios = require('axios');

class EvolutionAPITester {
  constructor() {
    this.evolutionApi = new EvolutionApiService();
    this.testInstanceName = `test-instance-${Date.now()}`;
    this.testResults = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const emoji = {
      info: '📋',
      success: '✅',
      error: '❌',
      warning: '⚠️',
      debug: '🔍'
    }[type] || '📋';
    
    console.log(`${emoji} [${timestamp}] ${message}`);
  }

  addResult(test, success, message, data = null) {
    this.testResults.push({ test, success, message, data, timestamp: new Date() });
  }

  async testConnectivity() {
    this.log('Testando conectividade com Evolution API...', 'debug');
    
    try {
      const response = await this.evolutionApi.axios.get('/instance/fetchInstances');
      this.log(`Conectividade OK - Status: ${response.status}`, 'success');
      this.addResult('connectivity', true, `Status ${response.status}`, response.data);
      return true;
    } catch (error) {
      this.log(`Falha na conectividade: ${error.message}`, 'error');
      this.addResult('connectivity', false, error.message);
      return false;
    }
  }

  async testCreateInstance() {
    this.log(`Criando instância de teste: ${this.testInstanceName}`, 'debug');
    
    try {
      const response = await this.evolutionApi.axios.post('/instance/create', {
        instanceName: this.testInstanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
        webhook: {
          url: process.env.EVOLUTION_WEBHOOK_URL || 'http://localhost:3001/api/webhooks/evolution',
          events: ['qrcode.updated', 'connection.update', 'messages.upsert']
        }
      });
      
      this.log('Instância criada com sucesso', 'success');
      this.addResult('create_instance', true, 'Instância criada', response.data);
      return response.data;
    } catch (error) {
      this.log(`Erro ao criar instância: ${error.response?.data?.message || error.message}`, 'error');
      this.addResult('create_instance', false, error.response?.data?.message || error.message);
      return null;
    }
  }

  async testInstanceStatus() {
    this.log(`Verificando status da instância: ${this.testInstanceName}`, 'debug');
    
    try {
      const response = await this.evolutionApi.axios.get(`/instance/connectionState/${this.testInstanceName}`);
      this.log(`Status da instância: ${response.data.state}`, 'success');
      this.addResult('instance_status', true, `Estado: ${response.data.state}`, response.data);
      return response.data;
    } catch (error) {
      this.log(`Erro ao verificar status: ${error.response?.data?.message || error.message}`, 'error');
      this.addResult('instance_status', false, error.response?.data?.message || error.message);
      return null;
    }
  }

  async testQRCode() {
    this.log(`Obtendo QR Code da instância: ${this.testInstanceName}`, 'debug');
    
    try {
      const response = await this.evolutionApi.axios.get(`/instance/connect/${this.testInstanceName}`);
      
      if (response.data.qrcode) {
        this.log('QR Code obtido com sucesso', 'success');
        this.log(`QR Code: ${response.data.qrcode.substring(0, 50)}...`, 'info');
        this.addResult('qrcode', true, 'QR Code gerado', { hasQrcode: true });
      } else {
        this.log('QR Code não disponível (instância pode já estar conectada)', 'warning');
        this.addResult('qrcode', true, 'QR Code não necessário', response.data);
      }
      
      return response.data;
    } catch (error) {
      this.log(`Erro ao obter QR Code: ${error.response?.data?.message || error.message}`, 'error');
      this.addResult('qrcode', false, error.response?.data?.message || error.message);
      return null;
    }
  }

  async testListInstances() {
    this.log('Listando todas as instâncias...', 'debug');
    
    try {
      const response = await this.evolutionApi.axios.get('/instance/fetchInstances');
      const instances = response.data;
      
      this.log(`Total de instâncias encontradas: ${instances.length}`, 'success');
      
      instances.forEach(instance => {
        this.log(`  - ${instance.instanceName}: ${instance.connectionStatus}`, 'info');
      });
      
      this.addResult('list_instances', true, `${instances.length} instâncias encontradas`, instances);
      return instances;
    } catch (error) {
      this.log(`Erro ao listar instâncias: ${error.response?.data?.message || error.message}`, 'error');
      this.addResult('list_instances', false, error.response?.data?.message || error.message);
      return null;
    }
  }

  async testWebhookEndpoint() {
    this.log('Testando endpoint de webhook local...', 'debug');
    
    try {
      const webhookUrl = 'http://localhost:3001/api/webhooks/evolution';
      const response = await axios.get('http://localhost:3001/api/health', { timeout: 5000 });
      
      this.log('Servidor backend está rodando', 'success');
      this.addResult('webhook_endpoint', true, 'Backend acessível', response.data);
      return true;
    } catch (error) {
      this.log(`Webhook endpoint não acessível: ${error.message}`, 'warning');
      this.addResult('webhook_endpoint', false, error.message);
      return false;
    }
  }

  async testCleanup() {
    this.log(`Removendo instância de teste: ${this.testInstanceName}`, 'debug');
    
    try {
      const response = await this.evolutionApi.axios.delete(`/instance/delete/${this.testInstanceName}`);
      this.log('Instância de teste removida com sucesso', 'success');
      this.addResult('cleanup', true, 'Instância removida', response.data);
      return true;
    } catch (error) {
      this.log(`Erro na limpeza: ${error.response?.data?.message || error.message}`, 'warning');
      this.addResult('cleanup', false, error.response?.data?.message || error.message);
      return false;
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 RELATÓRIO FINAL DOS TESTES');
    console.log('='.repeat(60));
    
    const successful = this.testResults.filter(r => r.success).length;
    const total = this.testResults.length;
    const percentage = Math.round((successful / total) * 100);
    
    console.log(`\n🎯 Resumo: ${successful}/${total} testes passaram (${percentage}%)\n`);
    
    this.testResults.forEach(result => {
      const status = result.success ? '✅' : '❌';
      console.log(`${status} ${result.test}: ${result.message}`);
    });
    
    console.log('\n' + '='.repeat(60));
    
    if (percentage >= 80) {
      console.log('🎉 SUCESSO! Evolution API está funcionando corretamente!');
      console.log('\n📝 Próximos passos:');
      console.log('1. Conecte uma instância real via QR Code');
      console.log('2. Teste o envio de mensagens');
      console.log('3. Configure webhooks para produção');
    } else if (percentage >= 50) {
      console.log('⚠️  PARCIAL: Alguns testes falharam, mas a base está funcionando');
      console.log('\n🔧 Verifique:');
      console.log('1. Se a Evolution API está rodando na porta 8080');
      console.log('2. Se as configurações de rede estão corretas');
      console.log('3. Se os webhooks estão configurados');
    } else {
      console.log('❌ FALHA: Muitos testes falharam');
      console.log('\n🆘 Ações necessárias:');
      console.log('1. Verifique se a Evolution API está instalada e rodando');
      console.log('2. Confirme as configurações no .env.evolution');
      console.log('3. Teste a conectividade de rede');
    }
    
    console.log('\n📚 Documentação: EVOLUTION_API_SETUP.md');
    console.log('='.repeat(60));
  }

  async runAllTests() {
    console.log('🚀 INICIANDO TESTES COMPLETOS DA EVOLUTION API');
    console.log('='.repeat(60));
    
    // Configurações
    console.log('\n📋 Configurações:');
    console.log(`   Base URL: ${this.evolutionApi.baseURL}`);
    console.log(`   API Key: ${this.evolutionApi.apiKey ? '***' + this.evolutionApi.apiKey.slice(-4) : 'Não configurada'}`);
    console.log(`   Instance: ${this.testInstanceName}`);
    console.log(`   Webhook: ${process.env.EVOLUTION_WEBHOOK_URL || 'http://localhost:3001/api/webhooks/evolution'}`);
    
    // Testes sequenciais
    const tests = [
      { name: 'Conectividade', fn: () => this.testConnectivity() },
      { name: 'Webhook Endpoint', fn: () => this.testWebhookEndpoint() },
      { name: 'Listar Instâncias', fn: () => this.testListInstances() },
      { name: 'Criar Instância', fn: () => this.testCreateInstance() },
      { name: 'Status da Instância', fn: () => this.testInstanceStatus() },
      { name: 'QR Code', fn: () => this.testQRCode() },
      { name: 'Limpeza', fn: () => this.testCleanup() }
    ];
    
    for (const test of tests) {
      console.log(`\n🔍 ${test.name}...`);
      await test.fn();
      
      // Pequena pausa entre testes
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    this.generateReport();
  }
}

// Executar testes
if (require.main === module) {
  const tester = new EvolutionAPITester();
  tester.runAllTests().catch(error => {
    console.error('❌ Erro fatal nos testes:', error);
    process.exit(1);
  });
}

module.exports = EvolutionAPITester;