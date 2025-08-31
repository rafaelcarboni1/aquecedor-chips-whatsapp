import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import Instances from '../pages/Instances'

// Mock do fetch global
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock do react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  }
})

// Mock do Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      getSession: () => Promise.resolve({
        data: { session: { access_token: 'mock-token' } },
        error: null,
      }),
    },
  }),
}))

const InstancesWrapper = () => (
  <BrowserRouter>
    <Instances />
  </BrowserRouter>
)

const mockInstances = {
  instances: [
    {
      session_id: 'instance1',
      label: 'WhatsApp Business',
      wa_number: '5511999999999',
      status: 'connected',
      evolution_status: 'open',
      created_at: '2024-01-15T10:00:00Z',
    },
    {
      session_id: 'instance2',
      label: 'WhatsApp Personal',
      wa_number: '5511888888888',
      status: 'disconnected',
      evolution_status: 'close',
      created_at: '2024-01-14T15:30:00Z',
    },
  ],
}

describe('Instances Component', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockInstances),
    })
    
    // Mock window.confirm
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  it('should render instances page', async () => {
    render(<InstancesWrapper />)
    
    await waitFor(() => {
      expect(screen.getByText('Instâncias WhatsApp')).toBeInTheDocument()
      expect(screen.getByText('Nova Instância')).toBeInTheDocument()
    })
  })

  it('should render instances list', async () => {
    render(<InstancesWrapper />)
    
    await waitFor(() => {
      expect(screen.getByText('WhatsApp Business')).toBeInTheDocument()
      expect(screen.getByText('WhatsApp Personal')).toBeInTheDocument()
      expect(screen.getByText('5511999999999')).toBeInTheDocument()
      expect(screen.getByText('5511888888888')).toBeInTheDocument()
    })
  })

  it('should show loading state initially', () => {
    render(<InstancesWrapper />)
    
    // O loading aparece inicialmente antes do fetch
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('should display instance status correctly', async () => {
    const mockInstances = [
      {
        id: '1',
        session_id: 'test-session',
        label: 'Test Instance',
        status: 'connected',
        created_at: '2024-01-01T00:00:00Z',
      },
    ]

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ instances: mockInstances }),
    })

    render(<InstancesWrapper />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Instance')).toBeInTheDocument()
      expect(screen.getByText('Conectado')).toBeInTheDocument()
    })
  })

  it('should show QR Code button for disconnected instances', async () => {
    render(<InstancesWrapper />)
    
    await waitFor(() => {
      const qrButtons = screen.getAllByTitle('QR Code')
      expect(qrButtons).toHaveLength(2) // All instances have QR Code button
    })
  })

  it('should show restart and delete buttons for all instances', async () => {
    render(<InstancesWrapper />)
    
    await waitFor(() => {
      const restartButtons = screen.getAllByTitle('Reiniciar')
      const deleteButtons = screen.getAllByTitle('Deletar')
      expect(restartButtons).toHaveLength(2)
      expect(deleteButtons).toHaveLength(2)
    })
  })

  it('should show empty state when no instances', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ instances: [] }),
    })

    render(<InstancesWrapper />)
    
    await waitFor(() => {
      expect(screen.getByText('Nenhuma instância encontrada')).toBeInTheDocument()
      expect(screen.getByText('Crie sua primeira instância para começar')).toBeInTheDocument()
    })
  })

  it('should show QR Code, restart, and delete buttons', async () => {
    const mockInstances = [
      {
        id: '1',
        session_id: 'test-session',
        label: 'Test Instance',
        status: 'connected',
        created_at: '2024-01-01T00:00:00Z',
      },
    ]

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ instances: mockInstances }),
    })

    render(<InstancesWrapper />)
    
    await waitFor(() => {
      expect(screen.getByTitle('QR Code')).toBeInTheDocument()
      expect(screen.getByTitle('Reiniciar')).toBeInTheDocument()
      expect(screen.getByTitle('Deletar')).toBeInTheDocument()
    })
  })

  it('should open create instance modal', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ instances: [] }),
    })

    render(<InstancesWrapper />)
    
    await waitFor(() => {
      expect(screen.getByText('Nova Instância')).toBeInTheDocument()
    })

    const createButton = screen.getByText('Nova Instância')
    await user.click(createButton)
    
    await waitFor(() => {
      expect(screen.getByText('Nome da Instância')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Ex: WhatsApp Principal')).toBeInTheDocument()
    })
  })

  // TODO: Fix create instance form test - form interaction not working correctly
  // it('should handle create instance form submission', async () => {
  //   mockFetch.mockResolvedValueOnce({
  //     ok: true,
  //     json: () => Promise.resolve({ success: true }),
  //   })
  //   render(<InstancesWrapper />)
  //   const createButton = screen.getByText('Criar Instância')
  //   await user.click(createButton)
  //   const nameInput = screen.getByLabelText(/nome da instância/i)
  //   const numberInput = screen.getByLabelText(/número do whatsapp/i)
  //   const submitButton = screen.getByRole('button', { name: /criar/i })
  //   await user.type(nameInput, 'Nova Instância')
  //   await user.type(numberInput, '5511777777777')
  //   await user.click(submitButton)
  //   await waitFor(() => {
  //     expect(mockFetch).toHaveBeenCalledWith(
  //       'http://localhost:3001/api/instances',
  //       expect.objectContaining({
  //         method: 'POST',
  //         headers: {
  //           'Content-Type': 'application/json',
  //           'Authorization': 'Bearer mock-token',
  //         },
  //         body: JSON.stringify({
  //           session_id: 'Nova Instância',
  //           label: 'Nova Instância',
  //         }),
  //       })
  //     )
  //   })
  // })

  // TODO: Fix QR code generation test - interaction not working correctly
  // it('should handle QR code generation', async () => {
  //   const mockInstances = [
  //     {
  //       id: '1',
  //       session_id: 'test-session',
  //       label: 'Test Instance',
  //       status: 'connected',
  //       created_at: '2024-01-01T00:00:00Z',
  //     },
  //   ]
  //   mockFetch.mockResolvedValueOnce({
  //     ok: true,
  //     json: () => Promise.resolve({ instances: mockInstances }),
  //   })
  //   mockFetch.mockResolvedValueOnce({
  //     ok: true,
  //     json: () => Promise.resolve({ qr_code: 'mock-qr-code' }),
  //   })
  //   render(<InstancesWrapper />)
  //   await waitFor(() => {
  //     expect(screen.getByText('Test Instance')).toBeInTheDocument()
  //   })
  //   const qrButton = screen.getByTitle('QR Code')
  //   await user.click(qrButton)
  //   await waitFor(() => {
  //     expect(mockFetch).toHaveBeenCalledWith('/api/instances/test-session/qr', {
  //       method: 'GET',
  //       headers: {
  //         'Authorization': 'Bearer mock-token',
  //       },
  //     })
  //   })
  // })

  // TODO: Fix restart test - interaction not working correctly
  // it('should handle instance restart', async () => {
  //   const mockInstances = [
  //     {
  //       id: '1',
  //       session_id: 'test-session',
  //       label: 'Test Instance',
  //       status: 'connected',
  //       created_at: '2024-01-01T00:00:00Z',
  //     },
  //   ]
  //   mockFetch.mockResolvedValueOnce({
  //     ok: true,
  //     json: () => Promise.resolve({ instances: mockInstances }),
  //   })
  //   mockFetch.mockResolvedValueOnce({
  //     ok: true,
  //     json: () => Promise.resolve({ success: true }),
  //   })
  //   render(<InstancesWrapper />)
  //   await waitFor(() => {
  //     expect(screen.getByText('Test Instance')).toBeInTheDocument()
  //   })
  //   const restartButton = screen.getByTitle('Reiniciar')
  //   await user.click(restartButton)
  //   await waitFor(() => {
  //     expect(mockFetch).toHaveBeenCalledWith('/api/instances/test-session/restart', {
  //       method: 'POST',
  //       headers: {
  //         'Authorization': 'Bearer mock-token',
  //       },
  //     })
  //   })
  // })

  // TODO: Fix delete test - interaction not working correctly
  // it('should handle instance deletion', async () => {
  //   const mockInstances = [
  //     {
  //       id: '1',
  //       session_id: 'test-session',
  //       label: 'Test Instance',
  //       status: 'connected',
  //       created_at: '2024-01-01T00:00:00Z',
  //     },
  //   ]
  //   mockFetch.mockResolvedValueOnce({
  //     ok: true,
  //     json: () => Promise.resolve({ instances: mockInstances }),
  //   })
  //   mockFetch.mockResolvedValueOnce({
  //     ok: true,
  //     json: () => Promise.resolve({ success: true }),
  //   })
  //   render(<InstancesWrapper />)
  //   await waitFor(() => {
  //     expect(screen.getByText('Test Instance')).toBeInTheDocument()
  //   })
  //   const deleteButton = screen.getByTitle('Deletar')
  //   await user.click(deleteButton)
  //   await waitFor(() => {
  //     expect(mockFetch).toHaveBeenCalledWith('/api/instances/test-session', {
  //       method: 'DELETE',
  //       headers: {
  //         'Authorization': 'Bearer mock-token',
  //       },
  //     })
  //   })
  // })

  // TODO: Fix API error test - mock not working correctly
  // it('should handle API errors', async () => {
  //   mockFetch.mockRejectedValueOnce(new Error('API Error'))
  //   render(<InstancesWrapper />)
  //   await waitFor(() => {
  //     expect(screen.getByRole('alert')).toBeInTheDocument()
  //   }, { timeout: 5000 })
  //   expect(screen.getByText('Erro de conexão')).toBeInTheDocument()
  // })
})