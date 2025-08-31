require('dotenv').config()
const { supabase } = require('./middleware/auth')

async function migrateDatabase() {
  console.log('Starting database migration...')
  
  try {
    // First, let's check what columns exist
    console.log('Checking existing table structure...')
    const { data: existingSessions, error: checkError } = await supabase
      .from('whatsapp_sessions')
      .select('*')
      .limit(1)
    
    if (checkError) {
      console.log('Table might not exist or has issues:', checkError.message)
    }
    
    // Execute migration SQL
    console.log('Executing migration...')
    
    const migrationSQL = `
      -- Add missing columns if they don't exist
      ALTER TABLE whatsapp_sessions 
      ADD COLUMN IF NOT EXISTS name VARCHAR(255) NOT NULL DEFAULT 'Unnamed Session';
      
      ALTER TABLE whatsapp_sessions 
      ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'disconnected';
      
      ALTER TABLE whatsapp_sessions 
      ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);
      
      ALTER TABLE whatsapp_sessions 
      ADD COLUMN IF NOT EXISTS messages_sent INTEGER DEFAULT 0;
      
      ALTER TABLE whatsapp_sessions 
      ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP WITH TIME ZONE;
      
      ALTER TABLE whatsapp_sessions 
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
      
      ALTER TABLE whatsapp_sessions 
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    `
    
    const { data: migrationResult, error: migrationError } = await supabase
      .rpc('exec_sql', { sql: migrationSQL })
    
    if (migrationError) {
      console.log('Migration via RPC failed, trying individual operations...')
      
      // Try to add columns one by one using individual queries
      const columns = [
        { name: 'name', type: 'VARCHAR(255)', default: "'Unnamed Session'" },
        { name: 'status', type: 'VARCHAR(50)', default: "'disconnected'" },
        { name: 'phone_number', type: 'VARCHAR(20)', default: 'NULL' },
        { name: 'messages_sent', type: 'INTEGER', default: '0' },
        { name: 'last_activity', type: 'TIMESTAMP WITH TIME ZONE', default: 'NULL' },
        { name: 'created_at', type: 'TIMESTAMP WITH TIME ZONE', default: 'NOW()' },
        { name: 'updated_at', type: 'TIMESTAMP WITH TIME ZONE', default: 'NOW()' }
      ]
      
      for (const column of columns) {
        try {
          const { error: colError } = await supabase
            .rpc('exec_sql', { 
              sql: `ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS ${column.name} ${column.type} DEFAULT ${column.default};` 
            })
          
          if (colError) {
            console.log(`Could not add column ${column.name}:`, colError.message)
          } else {
            console.log(`✅ Column ${column.name} added/verified`)
          }
        } catch (err) {
          console.log(`Error with column ${column.name}:`, err.message)
        }
      }
    } else {
      console.log('✅ Migration executed successfully')
    }
    
    // Test the table structure now
    console.log('\nTesting updated table structure...')
    const { data: testInsert, error: testError } = await supabase
      .from('whatsapp_sessions')
      .insert({
        user_id: '00000000-0000-0000-0000-000000000000', // dummy UUID
        name: 'Test Session',
        status: 'disconnected'
      })
      .select()
      .single()
    
    if (testError) {
      console.error('❌ Test insert failed:', testError)
    } else {
      console.log('✅ Test insert successful:', testInsert)
      
      // Clean up test data
      await supabase
        .from('whatsapp_sessions')
        .delete()
        .eq('id', testInsert.id)
      
      console.log('✅ Test data cleaned up')
    }
    
  } catch (error) {
    console.error('Migration failed:', error)
    throw error
  }
}

migrateDatabase()
  .then(() => {
    console.log('\n🎉 Database migration completed successfully!')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n❌ Migration failed:', error)
    process.exit(1)
  })