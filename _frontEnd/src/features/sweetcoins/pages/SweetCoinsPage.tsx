/**
 * SweetCoinsPage.tsx — Entry point del módulo CriptoTrufa.
 * La ruta /sweetcoins carga esta página (ya registrada en router.tsx).
 * Delega todo el contenido a PointsView para mantener el patrón page/view.
 */

import PointsView from './PointsView'

export default function SweetCoinsPage() {
  return <PointsView />
}
