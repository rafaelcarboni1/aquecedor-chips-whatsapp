require('dotenv').config()
const { supabase } = require('./middleware/auth')

async function checkDatabaseStructure() {
  console.log('Checking database structure...')
  
  try {
    // Check if whatsapp_sessions table exists and get its structure
    const { data, error } = await supabase
      .rpc('get_table_columns', { table_name: 'whatsapp_sessions' })
    
    if (error) {
      console.log('RPC not available, trying alternative method...')
      
      // Try to get table info using information_schema
      const { data: columns, error: colError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_name', 'whatsapp_sessions')
        .eq('table_schema', 'public')
      
      if (colError) {
        console.error('Could not get table structure:', colError)
        
        // Last resort: try to create a minimal session to see what fails
        console.log('Trying minimal insert to understand table structure...')
        const { data: insertResult, error: insertError } = await supabase
          .from('whatsapp_sessions')
          .insert({ id: 'test-id-123' })
          .select()
        
        if (insertError) {
          console.error('Insert error details:', insertError)
        } else {
          console.log('Unexpected success with minimal insert:', insertResult)
          // Clean up
          await supabase.from('whatsapp_sessions').delete().eq('id', 'test-id-123')
        }
      } else {
        console.log('Table columns:', columns)
      }
    } else {
      console.log('Table structure:', data)
    }
    
    // Check if we can list existing sessions
    const { data: sessions, error: sessionError } = await supabase
      .from('whatsapp_sessions')
      .select('*')
      .limit(5)
    
    if (sessionError) {
      console.error('Error listing sessions:', sessionError)
    } else {
      console.log('Existing sessions count:', sessions.length)
      if (sessions.length > 0) {
        console.log('Sample session structure:', Object.keys(sessions[0]))
        console.log('Sample session data:', sessions[0])
      }
    }
    
  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

checkDatabaseStructure()
  .then(() => {
    console.log('\nDatabase structure check completed.')
    process.exit(0)
  })
  .catch(error => {
    console.error('Check failed:', error)
    process.exit(1)
  })