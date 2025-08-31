require('dotenv').config()
const { supabase } = require('./middleware/auth')

async function inspectTable() {
  console.log('Inspecting whatsapp_sessions table...')
  
  try {
    // Try to insert with minimal data to see what fields are required/available
    console.log('Testing with minimal UUID...')
    const testId = '12345678-1234-1234-1234-123456789012'
    const userId = '87654321-4321-4321-4321-210987654321'
    
    const { data: minimalTest, error: minimalError } = await supabase
      .from('whatsapp_sessions')
      .insert({
        id: testId,
        user_id: userId
      })
      .select()
    
    if (minimalError) {
      console.log('Minimal insert error:', minimalError)
    } else {
      console.log('✅ Minimal insert successful:', minimalTest)
      
      // Get the inserted record to see its structure
      const { data: inserted, error: selectError } = await supabase
        .from('whatsapp_sessions')
        .select('*')
        .eq('id', testId)
        .single()
      
      if (selectError) {
        console.log('Select error:', selectError)
      } else {
        console.log('\n📋 Table structure based on inserted record:')
        console.log('Available columns:', Object.keys(inserted))
        console.log('Sample data:', inserted)
      }
      
      // Clean up
      await supabase.from('whatsapp_sessions').delete().eq('id', testId)
      console.log('✅ Test data cleaned up')
    }
    
    // Try different field combinations
    const testCombinations = [
      { id: '11111111-1111-1111-1111-111111111111', user_id: userId, session_name: 'Test' },
      { id: '22222222-2222-2222-2222-222222222222', user_id: userId, session_status: 'active' },
      { id: '33333333-3333-3333-3333-333333333333', user_id: userId, phone: '+1234567890' },
      { id: '44444444-4444-4444-4444-444444444444', user_id: userId, message_count: 0 }
    ]
    
    for (const combo of testCombinations) {
      const { data, error } = await supabase
        .from('whatsapp_sessions')
        .insert(combo)
        .select()
      
      if (!error) {
        console.log(`✅ Combination worked:`, Object.keys(combo))
        await supabase.from('whatsapp_sessions').delete().eq('id', combo.id)
      } else {
        console.log(`❌ Combination failed:`, Object.keys(combo), '-', error.message)
      }
    }
    
  } catch (error) {
    console.error('Inspection failed:', error)
  }
}

inspectTable()
  .then(() => {
    console.log('\nTable inspection completed.')
    process.exit(0)
  })
  .catch(error => {
    console.error('Inspection failed:', error)
    process.exit(1)
  })