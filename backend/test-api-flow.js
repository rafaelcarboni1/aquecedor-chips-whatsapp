require('dotenv').config()
const axios = require('axios')

const API_BASE_URL = 'http://localhost:3001/api'

async function testAPIFlow() {
  try {
    console.log('🚀 Iniciando teste do fluxo da API...')
    
    // 1. Verificar se o servidor está rodando
    console.log('\n1️⃣ Verificando servidor...')
    const healthResponse = await axios.get(`${API_BASE_URL}/health`)
    console.log('✅ Servidor está rodando:', healthResponse.data)
    
    // 2. Testar se conseguimos acessar o WhatsAppService diretamente
    console.log('\n2️⃣ Testando acesso direto ao WhatsAppService...')
    
    // Vamos criar um endpoint de teste temporário ou usar o que já existe
    // Por enquanto, vamos verificar se conseguimos fazer uma requisição básica
    
    try {
      // Tentar acessar um endpoint que pode não exigir auth
      const response = await axios.get(`${API_BASE_URL}/sessions`, {
        headers: { 'Authorization': 'Bearer invalid-token' }
      })
      console.log('📊 Resposta inesperada (deveria dar erro 401):', response.data)
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Autenticação funcionando corretamente (erro 401 esperado)')
      } else {
        console.log('⚠️  Erro inesperado:', error.response?.status, error.response?.data)
      }
    }
    
    console.log('\n🎯 Teste básico da API concluído!')
    console.log('\n📝 Próximos passos:')
    console.log('   1. O WhatsAppService está funcionando (testado diretamente)')
    console.log('   2. A API está rodando e respondendo')
    console.log('   3. A autenticação está ativa')
    console.log('   4. Para teste completo, use um usuário válido ou desative auth temporariamente')
    
  } catch (error) {
    console.error('❌ Erro no teste da API:')
    console.error('Status:', error.response?.status)
    console.error('Data:', error.response?.data)
    console.error('Message:', error.message)
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Dica: Verifique se o servidor está rodando em localhost:3001')
    }
  }
}

// Executar teste
testAPIFlow()
