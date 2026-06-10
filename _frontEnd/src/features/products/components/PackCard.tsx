/**
 * PackCard.tsx — Componente de dominio: Tarjeta de pack de regalo
 *
 * Dos botones:
 *   - "Ver más" (click → callback onViewDetails para abrir modal)
 *   - "Agregar al carrito" (API directa)
 */
import { Star } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router'
import type { Pack } from '../types'
import { useAddCartItem } from '@/features/cart/hooks/useCart'

interface PackCardProps {
  pack: Pack
}

export function PackCard({ pack }: PackCardProps) {
  const navigate = useNavigate()
  const addCartItem = useAddCartItem()

  const handleViewDetails = () => {
    navigate(`/pack/${pack.slug}`)
  }

  const handleAdd = () => {
    addCartItem.mutate(
      { id_producto: pack.id_paquete, cantidad: 1, es_paquete: true, id_paquete: pack.id_paquete },
      {
        onSuccess: () => {
          toast.success(
            <span>
              1× <strong>{pack.nombre}</strong> agregado 🛍️{' '}
              <button
                onClick={() => navigate('/carrito')}
                style={{ textDecoration: 'underline', fontWeight: 700, cursor: 'pointer', background: 'none', border: 'none', color: 'inherit', padding: 0 }}
              >
                Ver carrito
              </button>
            </span>
          )
        },
      },
    )
  }

  return (
    <div className="relative w-full max-w-[300px] h-[400px] overflow-hidden rounded-[24px] shadow-lg group mx-auto">
      <img
        src={pack.imagen_url || 'https://images.unsplash.com/photo-1513534894444-24c9190c3741?auto=format&fit=crop&q=80&w=600'}
        alt={pack.nombre}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        onError={(e) => {
          ;(e.target as HTMLImageElement).src =
            'https://images.unsplash.com/photo-1513534894444-24c9190c3741?auto=format&fit=crop&q=80&w=600'
        }}
      />

      <div className="absolute bottom-0 left-0 w-full bg-white/40 backdrop-blur-md px-5 py-5 flex flex-col justify-end border-white/30">
        <h4 className="font-display text-[#2a1115] text-xl font-black mb-0.5 line-clamp-1 leading-tight">
          {pack.nombre}
        </h4>

        <div className="flex items-center gap-1 text-[13px] font-bold text-[#2a1115] mb-2.5">
          <span>(S/. {Number(pack.precio).toFixed(2)} | +{Math.floor(Number(pack.precio) * 100).toLocaleString()}</span>
          <Star className="h-3.5 w-3.5 fill-[#ff7a45] text-[#ff7a45] -mt-0.5" />
          <span>)</span>
        </div>

        <p className="text-xs text-[#5c0f1b] font-semibold leading-relaxed mb-4 line-clamp-3">
          {pack.descripcion}
        </p>

        <div className="flex gap-2">
          <button
            onClick={handleViewDetails}
            className="flex-1 py-2.5 rounded-full border-2 border-[#5c0f1b]/30 text-[#5c0f1b] font-bold text-sm hover:bg-[#5c0f1b]/8 transition-all cursor-pointer bg-transparent"
          >
            Ver más
          </button>
          <button
            onClick={handleAdd}
            disabled={addCartItem.isPending}
            className="flex-1 py-2.5 rounded-full text-white font-bold text-sm bg-[#5c0f1b] hover:bg-[#7a1525] transition-all shadow-md cursor-pointer border-none disabled:opacity-60"
          >
            {addCartItem.isPending ? '...' : 'Agregar'}
          </button>
        </div>
      </div>
    </div>
  )
}
