#!/usr/bin/env node

const { EvolutionApiService } = require('./services/EvolutionApiService');
const axios = require('axios');
const readline = require('readline');

class VPSEvolutionTester {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    this.config = {
      baseURL: '',
      apiKey: '',
      webhookURL: ''
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const emoji = {
      info: '📋',
      success: '✅',
      error: '❌',
      warning: '⚠️',
      debug: '🔍',
      input: '💬'
    }[type] || '📋';
    
    console.log(`${emoji} [${timestamp}] ${message}`);
  }

  async askQuestion(question) {
    return new Promise((resolve) => {
      this.rl.question(`💬 ${question}: `, resolve);
    });
  }

  async collectVPSInfo() {
    console.log('\n' + '='.repeat(60));
    console.log('🔧 CONFIGURAÇÃO DA VPS - EVOLUTION API');
    console.log('='.repeat(60));
    
    this.log('Vamos configurar a conexão com sua Evolution API na VPS', 'info');
    
    // Coletar URL da VPS
    const vpsURL = await this.askQuestion('Digite a URL da sua VPS (ex: https://minha-vps.com:8080 ou http://IP:8080)');
    this.config.baseURL = vpsURL.replace(/\/$/, ''); // Remove trailing slash
    
    // Coletar API Key
    const apiKey = await this.askQuestion('Digite sua API Key da Evolution API (deixe vazio se não tiver)');
    this.config.apiKey = apiKey || '';
    
    // Coletar Webhook URL
    const webhookURL = await this.askQuestion('Digite a URL do seu webhook público (ex: https://meu-dominio.com/api/webhooks/evolution)');
    this.config.webhookURL = webhookURL || '';
    
    console.log('\n📋 Configurações coletadas:');
    console.log(`   VPS URL: ${this.config.baseURL}`);
    console.log(`   API Key: ${this.config.apiKey ? '***' + this.config.apiKey.slice(-4) : 'Não configurada'}`);
    console.log(`   Webhook: ${this.config.webhookURL}`);
    
    const confirm = await this.askQuestion('\nConfirma essas configurações? (y/n)');
    return confirm.toLowerCase() === 'y' || confirm.toLowerCase() === 'yes';
  }

  async testConnectivity() {
    this.log('Testando conectividade básica com a VPS...', 'debug');
    
    try {
      // Teste básico de conectividade
      const response = await axios.get(this.config.baseURL, {
        timeout: 10000,
        validateStatus: () => true // Aceita qualquer status
      });
      
      this.log(`Conectividade OK - Status: ${response.status}`, 'success');
      return true;
    } catch (error) {
      if (error.code === 'ENOTFOUND') {
        this.log('❌ Domínio não encontrado. Verifique a URL da VPS.', 'error');
      } else if (error.code === 'ECONNREFUSED') {
        this.log('❌ Conexão recusada. Verifique se a Evolution API está rodando na porta correta.', 'error');
      } else if (error.code === 'ETIMEDOUT') {
        this.log('❌ Timeout na conexão. Verifique firewall e conectividade.', 'error');
      } else {
        this.log(`❌ Erro de conectividade: ${error.message}`, 'error');
      }
      return false;
    }
  }

  async testEvolutionAPI() {
    this.log('Testando endpoints da Evolution API...', 'debug');
    
    const headers = {};
    if (this.config.apiKey) {
      headers['apikey'] = this.config.apiKey;
    }
    
    try {
      // Teste do endpoint de instâncias
      const response = await axios.get(`${this.config.baseURL}/instance/fetchInstances`, {
        headers,
        timeout: 15000
      });
      
      this.log(`Evolution API respondendo - Status: ${response.status}`, 'success');
      
      if (Array.isArray(response.data)) {
        this.log(`Total de instâncias encontradas: ${response.data.length}`, 'info');
        
        response.data.forEach((instance, index) => {
          if (index < 5) { // Mostrar apenas as primeiras 5
            this.log(`  - ${instance.instanceName || instance.instance}: ${instance.connectionStatus || instance.status}`, 'info');
          }
        });
        
        if (response.data.length > 5) {
          this.log(`  ... e mais ${response.data.length - 5} instâncias`, 'info');
        }
      }
      
      return { success: true, data: response.data };
    } catch (error) {
      if (error.response?.status === 401) {
        this.log('❌ Não autorizado. Verifique sua API Key.', 'error');
      } else if (error.response?.status === 404) {
        this.log('❌ Endpoint não encontrado. Verifique se a Evolution API está na versão correta.', 'error');
      } else {
        this.log(`❌ Erro na Evolution API: ${error.response?.data?.message || error.message}`, 'error');
      }
      return { success: false, error: error.message };
    }
  }

  async testCreateInstance() {
    this.log('Testando criação de instância de teste...', 'debug');
    
    const testInstanceName = `test-vps-${Date.now()}`;
    const headers = {};
    if (this.config.apiKey) {
      headers['apikey'] = this.config.apiKey;
    }
    
    try {
      const response = await axios.post(`${this.config.baseURL}/instance/create`, {
        instanceName: testInstanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
        webhook: {
          url: this.config.webhookURL,
          events: ['qrcode.updated', 'connection.update', 'messages.upsert']
        }
      }, {
        headers,
        timeout: 30000
      });
      
      this.log('✅ Instância de teste criada com sucesso!', 'success');
      this.log(`   Nome: ${testInstanceName}`, 'info');
      
      // Tentar obter QR Code
      await this.getQRCode(testInstanceName);
      
      // Limpeza
      await this.cleanupTestInstance(testInstanceName);
      
      return { success: true, instanceName: testInstanceName };
    } catch (error) {
      this.log(`❌ Erro ao criar instância: ${error.response?.data?.message || error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  async getQRCode(instanceName) {
    this.log(`Obtendo QR Code para ${instanceName}...`, 'debug');
    
    const headers = {};
    if (this.config.apiKey) {
      headers['apikey'] = this.config.apiKey;
    }
    
    try {
      const response = await axios.get(`${this.config.baseURL}/instance/connect/${instanceName}`, {
        headers,
        timeout: 15000
      });
      
      if (response.data.qrcode) {
        this.log('✅ QR Code gerado com sucesso!', 'success');
        this.log('📱 QR Code disponível para escaneamento', 'info');
      } else {
        this.log('ℹ️  QR Code não disponível (instância pode já estar conectada)', 'info');
      }
      
      return response.data;
    } catch (error) {
      this.log(`⚠️  Erro ao obter QR Code: ${error.response?.data?.message || error.message}`, 'warning');
      return null;
    }
  }

  async cleanupTestInstance(instanceName) {
    this.log(`Removendo instância de teste ${instanceName}...`, 'debug');
    
    const headers = {};
    if (this.config.apiKey) {
      headers['apikey'] = this.config.apiKey;
    }
    
    try {
      await axios.delete(`${this.config.baseURL}/instance/delete/${instanceName}`, {
        headers,
        timeout: 15000
      });
      
      this.log('✅ Instância de teste removida', 'success');
    } catch (error) {
      this.log(`⚠️  Erro na limpeza: ${error.response?.data?.message || error.message}`, 'warning');
    }
  }

  async updateEnvFile() {
    this.log('Atualizando arquivo .env.evolution...', 'debug');
    
    const fs = require('fs');
    const path = require('path');
    
    try {
      const envPath = path.join(__dirname, '.env.evolution');
      let envContent = fs.readFileSync(envPath, 'utf8');
      
      // Atualizar configurações
      envContent = envContent.replace(
        /EVOLUTION_API_BASE_URL=.*/,
        `EVOLUTION_API_BASE_URL=${this.config.baseURL}`
      );
      
      if (this.config.apiKey) {
        envContent = envContent.replace(
          /EVOLUTION_API_KEY=.*/,
          `EVOLUTION_API_KEY=${this.config.apiKey}`
        );
      }
      
      if (this.config.webhookURL) {
        envContent = envContent.replace(
          /EVOLUTION_WEBHOOK_URL=.*/,
          `EVOLUTION_WEBHOOK_URL=${this.config.webhookURL}`
        );
      }
      
      fs.writeFileSync(envPath, envContent);
      this.log('✅ Arquivo .env.evolution atualizado!', 'success');
      
    } catch (error) {
      this.log(`❌ Erro ao atualizar .env.evolution: ${error.message}`, 'error');
    }
  }

  async generateReport(results) {
    console.log('\n' + '='.repeat(60));
    console.log('📊 RELATÓRIO DE TESTE - VPS EVOLUTION API');
    console.log('='.repeat(60));
    
    console.log('\n🔧 Configuração:');
    console.log(`   VPS URL: ${this.config.baseURL}`);
    console.log(`   API Key: ${this.config.apiKey ? 'Configurada' : 'Não configurada'}`);
    console.log(`   Webhook: ${this.config.webhookURL || 'Não configurado'}`);
    
    console.log('\n🧪 Resultados dos Testes:');
    
    const tests = [
      { name: 'Conectividade VPS', result: results.connectivity },
      { name: 'Evolution API', result: results.evolutionAPI },
      { name: 'Criação de Instância', result: results.createInstance }
    ];
    
    tests.forEach(test => {
      const status = test.result ? '✅' : '❌';
      console.log(`   ${status} ${test.name}`);
    });
    
    const successCount = tests.filter(t => t.result).length;
    const percentage = Math.round((successCount / tests.length) * 100);
    
    console.log(`\n🎯 Taxa de Sucesso: ${successCount}/${tests.length} (${percentage}%)`);
    
    if (percentage === 100) {
      console.log('\n🎉 PERFEITO! Sua Evolution API na VPS está funcionando corretamente!');
      console.log('\n📝 Próximos passos:');
      console.log('1. ✅ Configuração da VPS validada');
      console.log('2. 🔄 Integre com seu sistema de produção');
      console.log('3. 📱 Conecte instâncias reais via QR Code');
      console.log('4. 🔔 Configure webhooks para receber eventos');
    } else if (percentage >= 66) {
      console.log('\n⚠️  PARCIAL: Alguns testes falharam, mas a base está funcionando');
      console.log('\n🔧 Verificações necessárias:');
      console.log('1. Confirme se todos os serviços estão rodando na VPS');
      console.log('2. Verifique configurações de firewall');
      console.log('3. Teste webhooks manualmente');
    } else {
      console.log('\n❌ PROBLEMAS: Muitos testes falharam');
      console.log('\n🆘 Ações necessárias:');
      console.log('1. Verifique se a Evolution API está instalada e rodando na VPS');
      console.log('2. Confirme a URL e porta da VPS');
      console.log('3. Verifique configurações de rede e firewall');
      console.log('4. Teste acesso direto via browser');
    }
    
    console.log('\n📚 Documentação: EVOLUTION_API_SETUP.md');
    console.log('='.repeat(60));
  }

  async run() {
    try {
      console.log('🚀 TESTE DE INTEGRAÇÃO - VPS EVOLUTION API');
      console.log('='.repeat(60));
      
      // Coletar informações da VPS
      const configConfirmed = await this.collectVPSInfo();
      if (!configConfirmed) {
        this.log('❌ Configuração cancelada pelo usuário', 'error');
        this.rl.close();
        return;
      }
      
      // Executar testes
      const results = {
        connectivity: false,
        evolutionAPI: false,
        createInstance: false
      };
      
      console.log('\n🧪 Iniciando testes...');
      
      // Teste 1: Conectividade
      results.connectivity = await this.testConnectivity();
      
      if (results.connectivity) {
        // Teste 2: Evolution API
        const apiResult = await this.testEvolutionAPI();
        results.evolutionAPI = apiResult.success;
        
        if (results.evolutionAPI) {
          // Teste 3: Criação de instância
          const instanceResult = await this.testCreateInstance();
          results.createInstance = instanceResult.success;
        }
      }
      
      // Atualizar arquivo .env se os testes básicos passaram
      if (results.connectivity && results.evolutionAPI) {
        await this.updateEnvFile();
      }
      
      // Gerar relatório
      await this.generateReport(results);
      
    } catch (error) {
      this.log(`❌ Erro fatal: ${error.message}`, 'error');
    } finally {
      this.rl.close();
    }
  }
}

// Executar teste
if (require.main === module) {
  const tester = new VPSEvolutionTester();
  tester.run().catch(error => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
}

module.exports = VPSEvolutionTester;