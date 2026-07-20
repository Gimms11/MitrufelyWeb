import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '../shared/components/ui/Button'

describe('Componente Button', () => {
  it('debe renderizar correctamente con sus hijos', () => {
    render(<Button>Hacer pedido</Button>)
    const buttonElement = screen.getByRole('button', { name: /Hacer pedido/i })
    expect(buttonElement).toBeInTheDocument()
  })

  it('debe aplicar la clase de variante correcta', () => {
    const { rerender } = render(<Button variant="primary">Boton</Button>)
    let buttonElement = screen.getByRole('button', { name: /Boton/i })
    expect(buttonElement.className).toContain('bg-[#5c0f1b]')

    rerender(<Button variant="accent">Boton</Button>)
    buttonElement = screen.getByRole('button', { name: /Boton/i })
    expect(buttonElement.className).toContain('bg-[#ff7a45]')
  })

  it('debe deshabilitar el boton si disabled es verdadero', () => {
    render(<Button disabled>Hacer pedido</Button>)
    const buttonElement = screen.getByRole('button', { name: /Hacer pedido/i })
    expect(buttonElement).toBeDisabled()
  })

  it('debe llamar al controlador onClick al hacer clic', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Hacer pedido</Button>)
    const buttonElement = screen.getByRole('button', { name: /Hacer pedido/i })
    fireEvent.click(buttonElement)
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
