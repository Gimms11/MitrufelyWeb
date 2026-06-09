# SKILL 09 — Background Tasks (Celery + Redis) — ACTUALIZADO

> **CUÁNDO USAR:** Antes de implementar tareas asíncronas, workers, generación de PDF, o jobs de expiración.
> **Última actualización:** 2026-06-09 — Refleja implementación real post-Fase 4.

---

## 1. Stack

| Componente | Tecnología |
|---|---|
| Task Queue | Celery |
| Broker | Redis (DB 1) |
| Result Backend | Redis (DB 2) |
| Beat Scheduler | Celery Beat |
| PDF | WeasyPrint (pendiente) |
| Config | `settings.CELERY_BROKER_URL`, `settings.CELERY_RESULT_BACKEND` |

---

## 2. Estructura de Workers (REAL)

```
app/infrastructure/workers/
├── celery_app.py          # Celery app factory + beat schedule
├── __init__.py
└── tasks/
    ├── __init__.py
    ├── inventory.py       ✅ Expiración de lotes (implementado)
    ├── ventas.py          ✅ Expiración de ventas pendientes (implementado)
    ├── reports.py         ⚠️ Stub — PDF/Excel (pendiente Fase 6)
    ├── analytics.py       ⚠️ Stub — Agregaciones diarias (pendiente Fase 6)
    └── notifications.py   ⚠️ Stub — Email/WhatsApp (pendiente)
```

---

## 3. Celery App Factory (REAL)

```python
# app/infrastructure/workers/celery_app.py
celery_app = Celery(
    "mifrufely",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        "app.infrastructure.workers.tasks.reports",
        "app.infrastructure.workers.tasks.notifications",
        "app.infrastructure.workers.tasks.analytics",
        "app.infrastructure.workers.tasks.inventory",
        "app.infrastructure.workers.tasks.ventas",       # ← Fase 4
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="America/Lima",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    result_expires=3600,
    beat_schedule={
        "aggregate-daily-analytics": {
            "task": "app.infrastructure.workers.tasks.analytics.aggregate_daily",
            "schedule": 86400.0,
        },
        "expire-lots-daily": {
            "task": "app.infrastructure.workers.tasks.inventory.expire_lots",
            "schedule": 86400.0,
        },
        "expire-pending-ventas": {                                # ← Fase 4
            "task": "app.infrastructure.workers.tasks.ventas.expire_pending",
            "schedule": 300.0,  # Cada 5 minutos
        },
    },
)
```

---

## 4. Tareas Implementadas

### 4.1 Expiración de Lotes Vencidos (Fase 3 — implementada)

```python
# app/infrastructure/workers/tasks/inventory.py
@celery_app.task(name="app.infrastructure.workers.tasks.inventory.expire_lots",
                 bind=True, max_retries=3, default_retry_delay=300)
def expire_lots(self) -> dict:
    lotes_expirados = asyncio.run(_run_expire_lots())
    return {"status": "ok", "lotes_expirados": lotes_expirados}

async def _run_expire_lots() -> int:
    async with AsyncSessionFactory() as session:
        async with session.begin():
            result = await session.execute(text("SELECT sp_expirar_lotes_vencidos()"))
            lotes_expirados: int = result.scalar_one()
    return lotes_expirados
```

### 4.2 Expiración de Ventas Pendientes (Fase 4 — implementada)

```python
# app/infrastructure/workers/tasks/ventas.py
@celery_app.task(name="app.infrastructure.workers.tasks.ventas.expire_pending",
                 bind=True, max_retries=3, default_retry_delay=120)
def expire_pending(self) -> dict:
    anuladas = asyncio.run(_run_expire_pending_ventas())
    return {"status": "ok", "ventas_anuladas": anuladas}

async def _run_expire_pending_ventas() -> int:
    async with AsyncSessionFactory() as session:
        async with session.begin():
            result = await session.execute(text("""
                UPDATE ventas SET estado = 'ANULADO'
                WHERE estado = 'PENDIENTE' AND estado_pago = 'PENDIENTE'
                  AND fecha_venta < NOW() - INTERVAL '15 minutes'
            """))
            anuladas: int = result.rowcount
    return anuladas
```

> **Nota:** La anulación dispara `tg_ventas_anular` que revierte stock, libera cupón y contra-asienta puntos automáticamente.

### 4.3 Generación de PDF (stub — pendiente Fase 6)

```python
# app/infrastructure/workers/tasks/reports.py
@celery_app.task(name="app.infrastructure.workers.tasks.reports.generate_sales_pdf",
                 bind=True, max_retries=3)
def generate_sales_pdf(self, report_params):
    raise NotImplementedError("PDF generation not yet implemented (Fase 6)")
```

### 4.4 Agregación Analítica (stub — pendiente Fase 6)

```python
# app/infrastructure/workers/tasks/analytics.py
@celery_app.task(name="app.infrastructure.workers.tasks.analytics.aggregate_daily")
def aggregate_daily():
    raise NotImplementedError("Analytics aggregation not yet implemented (Fase 6)")
```

---

## 5. Variables de Entorno

```env
# .env
CELERY_BROKER_URL=redis://localhost:6379/1
CELERY_RESULT_BACKEND=redis://localhost:6379/2
REDIS_URL=redis://localhost:6379/0
```

---

## 6. Comandos para Ejecutar Workers

```bash
# Worker principal
celery -A app.infrastructure.workers.celery_app worker --loglevel=info

# Beat scheduler
celery -A app.infrastructure.workers.celery_app beat --loglevel=info
```
