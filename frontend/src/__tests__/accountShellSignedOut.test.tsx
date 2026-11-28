import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AccountShell } from '@/components/account/AccountShell'

const auth = { isAuthenticated: false }
vi.mock('@/store/authStore', () => ({
  useAuthStore: (sel?: (s: typeof auth) => unknown) => (sel ? sel(auth) : auth),
}))

const shell = () => render(
  <AccountShell active="orders" title="My orders" onLogout={() => {}}>
    <p>Your order list</p>
  </AccountShell>,
)

beforeEach(() => { auth.isAuthenticated = false })

describe('AccountShell', () => {
  it('asks a visitor who is not signed in to sign in, instead of showing an empty account', () => {
    shell()
    expect(screen.queryByText('Your order list')).toBeNull()
    expect(screen.queryByRole('button', { name: /sign out/i })).toBeNull()
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/auth/login')
    expect(screen.getByRole('link', { name: /create an account/i })).toHaveAttribute('href', '/auth/register')
  })

  it('shows the account to a signed-in customer', () => {
    auth.isAuthenticated = true
    shell()
    expect(screen.getByText('Your order list')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /sign out/i }).length).toBeGreaterThan(0)
  })
})
