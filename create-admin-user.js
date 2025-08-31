import axios from 'axios';

async function createAdminUser() {
  try {
    const response = await axios.post('http://localhost:3001/auth/register', {
      email: 'admin@gmail.com',
      password: '123456',
      name: 'Admin User'
    });
    
    console.log('✅ Usuário admin criado com sucesso!');
    console.log('Email: admin@gmail.com');
    console.log('Senha: 123456');
    console.log('Response:', response.data);
  } catch (error) {
    if (error.response?.status === 409) {
      console.log('ℹ️ Usuário admin já existe!');
      console.log('Email: admin@gmail.com');
      console.log('Senha: 123456');
    } else {
      console.error('❌ Erro ao criar usuário admin:', error.response?.data || error.message);
    }
  }
}

createAdminUser();