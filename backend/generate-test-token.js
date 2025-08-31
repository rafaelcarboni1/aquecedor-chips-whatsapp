require('dotenv').config()
const jwt = require('jsonwebtoken')

// Generate a valid test token
const payload = {
  userId: '12345678-1234-1234-1234-123456789012',
  role: 'user',
  permissions: ['sessions:create', 'sessions:read'],
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour
}

const token = jwt.sign(payload, process.env.JWT_SECRET)

console.log('Generated test token:')
console.log(token)
console.log('\nTest curl command:')
console.log(`curl -X POST http://localhost:3001/api/sessions -H "Content-Type: application/json" -H "Authorization: Bearer ${token}" -d '{"name":"Test Session"}'`)