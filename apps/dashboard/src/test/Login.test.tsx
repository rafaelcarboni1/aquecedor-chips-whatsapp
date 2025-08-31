import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import Login from '../pages/Login'

// Mock do react-router-dom
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// Mock do fetch global
const mockFetch = vi.fn()
global.fetch = mockFetch

const mockOnLogin = vi.fn()

const LoginWrapper = () => (
  <BrowserRouter>
    <Login onLogin={mockOnLogin} />
  </BrowserRouter>
)

describe('Login Component', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ access_token: 'mock-token', refresh_token: 'mock-refresh' }),
    })
  })

  it('should render login form', () => {
    render(<LoginWrapper />)
    
    expect(screen.getByText('Faça login em sua conta')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/senha/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument()
  })

  it('should require email and password fields', () => {
    render(<LoginWrapper />)
    
    const emailInput = screen.getByPlaceholderText(/email/i)
    const passwordInput = screen.getByPlaceholderText(/senha/i)
    
    expect(emailInput).toBeRequired()
    expect(passwordInput).toBeRequired()
  })

  it('should call API on form submission', async () => {
    render(<LoginWrapper />)
    
    const emailInput = screen.getByPlaceholderText(/email/i)
    const passwordInput = screen.getByPlaceholderText(/senha/i)
    const submitButton = screen.getByRole('button', { name: /entrar/i })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      })
    })
  })

  it('should show error message on login failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ message: 'Invalid credentials' }),
    })

    render(<LoginWrapper />)
    
    const emailInput = screen.getByPlaceholderText(/email/i)
    const passwordInput = screen.getByPlaceholderText(/senha/i)
    const submitButton = screen.getByRole('button', { name: /entrar/i })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'wrongpassword')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
    })
  })

  it('should call onLogin and navigate on successful login', async () => {
    render(<LoginWrapper />)
    
    const emailInput = screen.getByPlaceholderText(/email/i)
    const passwordInput = screen.getByPlaceholderText(/senha/i)
    const submitButton = screen.getByRole('button', { name: /entrar/i })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockOnLogin).toHaveBeenCalled()
      expect(mockNavigate).toHaveBeenCalledWith('/')
    })
  })
})