## Plan: Mejora de la máquina de Estados de Pedidos (Fase 5 extendida)

### Diagnóstico confirmado (3 causas)

1. **Bug bloqueante (frontend):** `OrdersPage.tsx:59-73` llama a la mutación **sin `payload`**, pero el backend exige `motivo` obligatorio (mín. 5 chars) para `cancelar`, `devolver` y `reembolsar`. Resultado: **HTTP 422** antes de evaluar la FSM. Este es el motivo real por el que no se puede cancelar hoy.
2. **FSM restrictiva:** `EN_CAMINO → ENTREGADO` es la única salida. Un pedido en tránsito que no se pudo entregar (cliente no ubicado, dirección errada, dañado) **no tiene transición válida** → queda atascado.
3. **UI ↔ FSM desalineadas:** "Cancelar" solo aparece en `PENDIENTE` (la FSM lo permite también en `PAGADO`/`PREPARANDO`); "Reembolsar" aparece en `PAGADO` pero la FSM **no** lo permite desde ahí → error garantizado. Además **no existe cancelación para el cliente** y no se verifica **titularidad** (brecha de seguridad).

---

### Cambios del Backend (`_backEnd/`)

#### 1. FSM más robusta — `app/modules/orders/state_machine.py`
Ampliar el dict `VALID_TRANSITIONS` (línea 25) y el docstring (línea 5):
- **`EN_CAMINO → DEVUELTO`** (NUEVO): pedido en tránsito que retorna a tienda (escenario de error real más importante).
- **`ENTREGADO → REEMBOLSADO`** (NUEVO): reembolso directo sin forzar pasar por `DEVUELTO`.
- Mantener todo lo demás. Los helpers `can_cancel`/`can_request_refund` se recalculan automáticamente al cambiar el dict.

#### 2. Verificación de titularidad — `app/modules/orders/service.py` + `router.py`
- `cancelar()` (línea 628) y `solicitar_devolucion()` (línea 776): recibir el rol del usuario y, si es **CLIENTE**, validar que `venta.id_cliente` pertenezca a ese usuario; si no, lanzar `ForbiddenError`. Los ADMIN mantienen acceso total.
- Pasar `es_admin: bool` desde el router (`current_user.is_admin()`) a estos métodos.

#### 3. `solicitar_devolucion` desde `EN_CAMINO` — `service.py`
Tras añadir `EN_CAMINO → DEVUELTO` en la FSM, el método existente ya funciona (usa `_cambiar_estado` → `validate_transition`). Solo asegurar que el reintegro de stock (`_devolver_stock`) y el evento `DEVOLUCION_APROBADA` se mantengan. **Sin código nuevo** aquí, solo funciona por la FSM ampliada.

#### 4. Documentar el alcance del override — `state_machine.py`
Aclarar en el docstring que el admin opera bajo las mismas reglas (sin override manual), para auditoría clara.

---

### Cambios del Frontend (`_frontEnd/`)

#### 5. Modal de transición con captura de motivo — `OrdersPage.tsx`
Reescribir el modal (líneas 36-40, 319-351):
- Añadir campos dinámicos según la `action`: `cancelar`/`devolver` → `<textarea>` para `motivo` + `observaciones`; `reembolsar` → `motivo` + `monto` (numérico).
- Validar cliente-side: motivo mín. 5 caracteres antes de habilitar "Sí, aplicar".
- **No cerrar el modal en `onError`** (línea 67-69): mostrar el error dentro del modal para permitir reintentar.

#### 6. `confirmTransition` envía payload — `OrdersPage.tsx:59-73`
Construir el payload según la acción y pasarlo a `transitionMut.mutate({ id, action, payload })`.

#### 7. Botones alineados con la FSM — `OrdersPage.tsx:197-217`
- `PENDIENTE`: Pagar, **Cancelar**.
- `PAGADO`: Preparar, **Cancelar** (la FSM lo permite).
- `PREPARANDO`: Despachar, **Cancelar**.
- `EN_CAMINO`: Entregar, **Devolver** (NUEVO, antes imposible).
- `ENTREGADO`: Devolver, Reembolsar.
- `DEVUELTO`/`CANCELADO`: Reembolsar.
- Quitar "Reembolsar" de `PAGADO` (no permitido por la FSM).

#### 8. Cancelación para el cliente — `CustomerOrderDetailPage.tsx`
Añadir botón **"Cancelar pedido"** visible cuando `estado` ∈ `['PENDIENTE','PAGADO','PREPARANDO']`, con un modal de motivo (reutilizando el patrón). Conecta a `useTransitionVentaMutation({ action: 'cancelar', payload: { motivo } })`. El backend validará la titularidad.

#### 9. Mensajes contextuales — `useOrders.ts:77`
Toast de éxito específico por acción ("Pedido cancelado", "Pedido enviado", etc.) en vez del genérico "Transición aplicada".

---

### Tests (`_backEnd/tests/`)

#### 10. Tests unitarios de la FSM — `tests/unit/test_state_machine.py` (NUEVO)
Cubre `validate_transition`, `can_cancel`, `can_request_refund`, `is_terminal` para: transición válida, transición inválida (mensaje), estado terminal, y los **nuevos caminos** `EN_CAMINO→DEVUELTO` y `ENTREGADO→REEMBOLSADO`.

#### 11. Tests de `cancelar` con titularidad — extender `tests/unit/test_venta_service.py`
Cubrir: cancelación exitosa, cancelación desde estado no cancelable (`EN_CAMINO`) → `BusinessRuleError`, y cliente intentando cancelar pedido ajeno → `ForbiddenError`.

---

### Verificación final (auditoría)
- `pytest` backend: debe seguir en verde (146+) + los nuevos tests.
- `tsc --noEmit` + `npm run build` frontend: sin errores.
- Comprobación manual del flujo: crear venta → pagar → cancelar (con motivo) → verificar reintegro de stock y evento en `order_events`.

---

### Archivos a tocar
**Backend:** `state_machine.py`, `service.py`, `router.py`, nuevo `tests/unit/test_state_machine.py`, extender `test_venta_service.py`.
**Frontend:** `OrdersPage.tsx`, `CustomerOrderDetailPage.tsx`, `useOrders.ts`.

### Lo que NO haré (por la opción elegida "Robusta")
- No añadir override manual de admin (forzar cualquier transición).
- No añadir `PAGADO → REEMBOLSADO` directo (se mantiene el flujo cancelar→reembolsar).