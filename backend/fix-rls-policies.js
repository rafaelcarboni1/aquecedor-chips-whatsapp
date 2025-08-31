const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Usar service role key para ter permissões administrativas
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixRLSPolicies() {
  console.log('Verificando e corrigindo políticas RLS para whatsapp_sessions...');
  
  try {
    // 1. Verificar se RLS está habilitado
    console.log('\n1. Verificando status do RLS...');
    const { data: tableInfo, error: tableError } = await supabase
      .rpc('sql', {
        query: `
          SELECT 
            schemaname,
            tablename,
            rowsecurity as rls_enabled,
            forcerowsecurity as force_rls
          FROM pg_tables 
          WHERE tablename = 'whatsapp_sessions';
        `
      });
    
    if (tableError) {
      console.error('Erro ao verificar RLS:', tableError);
    } else {
      console.log('Status da tabela:', tableInfo);
    }
    
    // 2. Listar políticas existentes
    console.log('\n2. Listando políticas existentes...');
    const { data: policies, error: policiesError } = await supabase
      .rpc('sql', {
        query: `
          SELECT 
            policyname,
            permissive,
            roles,
            cmd,
            qual,
            with_check
          FROM pg_policies 
          WHERE tablename = 'whatsapp_sessions';
        `
      });
    
    if (policiesError) {
      console.error('Erro ao listar políticas:', policiesError);
    } else {
      console.log('Políticas encontradas:', policies);
    }
    
    // 3. Criar política para permitir inserção por usuários autenticados
    console.log('\n3. Criando política de inserção...');
    const { data: createPolicy, error: createError } = await supabase
      .rpc('sql', {
        query: `
          -- Remover política existente se houver
          DROP POLICY IF EXISTS "Users can insert their own sessions" ON whatsapp_sessions;
          
          -- Criar nova política
          CREATE POLICY "Users can insert their own sessions" 
          ON whatsapp_sessions 
          FOR INSERT 
          WITH CHECK (auth.uid() = user_id);
        `
      });
    
    if (createError) {
      console.error('Erro ao criar política de inserção:', createError);
    } else {
      console.log('Política de inserção criada com sucesso');
    }
    
    // 4. Criar política para permitir leitura por usuários autenticados
    console.log('\n4. Criando política de leitura...');
    const { data: selectPolicy, error: selectError } = await supabase
      .rpc('sql', {
        query: `
          -- Remover política existente se houver
          DROP POLICY IF EXISTS "Users can view their own sessions" ON whatsapp_sessions;
          
          -- Criar nova política
          CREATE POLICY "Users can view their own sessions" 
          ON whatsapp_sessions 
          FOR SELECT 
          USING (auth.uid() = user_id);
        `
      });
    
    if (selectError) {
      console.error('Erro ao criar política de leitura:', selectError);
    } else {
      console.log('Política de leitura criada com sucesso');
    }
    
    // 5. Criar política para permitir atualização por usuários autenticados
    console.log('\n5. Criando política de atualização...');
    const { data: updatePolicy, error: updateError } = await supabase
      .rpc('sql', {
        query: `
          -- Remover política existente se houver
          DROP POLICY IF EXISTS "Users can update their own sessions" ON whatsapp_sessions;
          
          -- Criar nova política
          CREATE POLICY "Users can update their own sessions" 
          ON whatsapp_sessions 
          FOR UPDATE 
          USING (auth.uid() = user_id)
          WITH CHECK (auth.uid() = user_id);
        `
      });
    
    if (updateError) {
      console.error('Erro ao criar política de atualização:', updateError);
    } else {
      console.log('Política de atualização criada com sucesso');
    }
    
    // 6. Criar política para permitir exclusão por usuários autenticados
    console.log('\n6. Criando política de exclusão...');
    const { data: deletePolicy, error: deleteError } = await supabase
      .rpc('sql', {
        query: `
          -- Remover política existente se houver
          DROP POLICY IF EXISTS "Users can delete their own sessions" ON whatsapp_sessions;
          
          -- Criar nova política
          CREATE POLICY "Users can delete their own sessions" 
          ON whatsapp_sessions 
          FOR DELETE 
          USING (auth.uid() = user_id);
        `
      });
    
    if (deleteError) {
      console.error('Erro ao criar política de exclusão:', deleteError);
    } else {
      console.log('Política de exclusão criada com sucesso');
    }
    
    // 7. Verificar políticas finais
    console.log('\n7. Verificando políticas finais...');
    const { data: finalPolicies, error: finalError } = await supabase
      .rpc('sql', {
        query: `
          SELECT 
            policyname,
            permissive,
            roles,
            cmd,
            qual,
            with_check
          FROM pg_policies 
          WHERE tablename = 'whatsapp_sessions'
          ORDER BY policyname;
        `
      });
    
    if (finalError) {
      console.error('Erro ao verificar políticas finais:', finalError);
    } else {
      console.log('Políticas finais:', finalPolicies);
    }
    
    console.log('\n✅ Correção das políticas RLS concluída!');
    
  } catch (error) {
    console.error('Erro geral:', error);
  }
}

fixRLSPolicies();