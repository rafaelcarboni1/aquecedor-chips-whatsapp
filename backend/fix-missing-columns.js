require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

// Usar service role key para operações administrativas
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function addMissingColumns() {
  console.log('🔧 Verificando e adicionando colunas faltantes na tabela whatsapp_sessions...')
  
  try {
    // Primeiro, vamos testar se as colunas já existem
    console.log('🔍 Testando se as colunas existem...')
    
    const { data: testData, error: testError } = await supabase
      .from('whatsapp_sessions')
      .select('id, messages_sent, uptime_hours, warmup_active, warmup_count')
      .limit(1)
    
    if (testError) {
      if (testError.code === '42703') {
        console.log('❌ Colunas não existem. Erro:', testError.message)
        console.log('\n⚠️  As colunas precisam ser adicionadas manualmente no Supabase Dashboard.')
        console.log('\n📋 Execute este SQL no Supabase SQL Editor:')
        console.log('\nALTER TABLE whatsapp_sessions')
        console.log('ADD COLUMN IF NOT EXISTS messages_sent INTEGER DEFAULT 0,')
        console.log('ADD COLUMN IF NOT EXISTS uptime_hours INTEGER DEFAULT 0,')
        console.log('ADD COLUMN IF NOT EXISTS warmup_active BOOLEAN DEFAULT false,')
        console.log('ADD COLUMN IF NOT EXISTS warmup_count INTEGER DEFAULT 0;')
        console.log('\n🌐 Acesse: https://zefqbvditqxeomlpxmbp.supabase.co/project/zefqbvditqxeomlpxmbp/sql')
      } else {
        console.error('❌ Erro inesperado:', testError)
      }
    } else {
      console.log('✅ Todas as colunas existem e funcionam corretamente!')
      if (testData.length > 0) {
        console.log('📊 Exemplo de dados:', testData[0])
      }
    }
    
    // Vamos também verificar a estrutura atual da tabela
    console.log('\n🔍 Verificando estrutura atual da tabela...')
    const { data: allData, error: allError } = await supabase
      .from('whatsapp_sessions')
      .select('*')
      .limit(1)
    
    if (allError) {
      console.error('❌ Erro ao buscar dados da tabela:', allError)
    } else {
      console.log('\n📋 Colunas disponíveis na tabela:')
      if (allData.length > 0) {
        Object.keys(allData[0]).forEach(column => {
          console.log(`  - ${column}`)
        })
      } else {
        console.log('  (Tabela vazia - não é possível determinar colunas)')
      }
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error)
  }
}

addMissingColumns()
  .then(() => {
    console.log('\n🎉 Verificação concluída!')
    process.exit(0)
  })
  .catch(error => {
    console.error('💥 Erro fatal:', error)
    process.exit(1)
  })