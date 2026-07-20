"""
Tests unitarios para Celery Beat Tasks — RU-02

Estrategia:
  1. Verificar la configuración del beat_schedule (síncrono, sin mocks complejos).
  2. Para las funciones async internas, mockear la capa de DB completa usando
     patch sobre `asyncio.run` en los módulos de las tareas, para probar que
     la lógica de orquestación del task síncrono (logging + return dict + retry)
     funcione correctamente.

Tareas cubiertas:
  - expire_lots (inventory.py)
  - expire_pending (ventas.py)
  - expire_coupons (sweetcoins.py)
"""

from unittest.mock import MagicMock, patch

import pytest


# ─── Beat Schedule Configuration ─────────────────────────────────────────────


class TestBeatScheduleConfig:
    """Verifica que las tareas periódicas estén correctamente registradas."""

    def test_beat_schedule_contains_expire_lots(self):
        from app.infrastructure.workers.celery_app import celery_app

        schedule = celery_app.conf.beat_schedule
        assert "expire-lots-daily" in schedule
        assert schedule["expire-lots-daily"]["task"] == (
            "app.infrastructure.workers.tasks.inventory.expire_lots"
        )
        assert schedule["expire-lots-daily"]["schedule"] == 86400.0

    def test_beat_schedule_contains_expire_pending(self):
        from app.infrastructure.workers.celery_app import celery_app

        schedule = celery_app.conf.beat_schedule
        assert "expire-pending-ventas" in schedule
        assert schedule["expire-pending-ventas"]["task"] == (
            "app.infrastructure.workers.tasks.ventas.expire_pending"
        )
        assert schedule["expire-pending-ventas"]["schedule"] == 300.0

    def test_beat_schedule_contains_expire_coupons(self):
        from app.infrastructure.workers.celery_app import celery_app

        schedule = celery_app.conf.beat_schedule
        assert "expire-coupons-daily" in schedule
        assert schedule["expire-coupons-daily"]["task"] == (
            "app.infrastructure.workers.tasks.sweetcoins.expire_coupons"
        )
        assert schedule["expire-coupons-daily"]["schedule"] == 86400.0

    def test_beat_schedule_has_four_entries(self):
        from app.infrastructure.workers.celery_app import celery_app

        schedule = celery_app.conf.beat_schedule
        assert len(schedule) == 4  # expire-lots, expire-pending, expire-coupons, aggregate-daily


# ─── Task Orchestration: expire_lots ──────────────────────────────────────────


class TestExpireLotsTask:
    """Tests para la tarea Celery expire_lots usando apply()."""

    @patch("app.infrastructure.workers.tasks.inventory._run_expire_lots")
    @patch("app.infrastructure.workers.tasks.inventory.asyncio")
    def test_expire_lots_success(self, mock_asyncio, mock_run_fn):
        """Retorna resultado exitoso cuando tiene éxito."""
        mock_asyncio.run.return_value = 5

        from app.infrastructure.workers.tasks.inventory import expire_lots

        # Usamos .apply() para ejecutar la tarea sincrónicamente sin un broker
        result = expire_lots.apply()

        assert result.result == {"status": "ok", "lotes_expirados": 5}
        assert result.successful()

    @patch("app.infrastructure.workers.tasks.inventory._run_expire_lots")
    @patch("app.infrastructure.workers.tasks.inventory.asyncio")
    def test_expire_lots_zero(self, mock_asyncio, mock_run_fn):
        """Retorna 0 lotes expirados cuando no hay lotes vencidos."""
        mock_asyncio.run.return_value = 0

        from app.infrastructure.workers.tasks.inventory import expire_lots

        result = expire_lots.apply()

        assert result.result == {"status": "ok", "lotes_expirados": 0}
        assert result.successful()


# ─── Task Orchestration: expire_pending ───────────────────────────────────────


class TestExpirePendingTask:
    """Tests para la tarea Celery expire_pending usando apply()."""

    @patch("app.infrastructure.workers.tasks.ventas._run_expire_pending_ventas")
    @patch("app.infrastructure.workers.tasks.ventas.asyncio")
    def test_expire_pending_success(self, mock_asyncio, mock_run_fn):
        """Retorna resultado exitoso cuando tiene éxito."""
        mock_asyncio.run.return_value = 3

        from app.infrastructure.workers.tasks.ventas import expire_pending

        result = expire_pending.apply()

        assert result.result == {"status": "ok", "ventas_anuladas": 3}
        assert result.successful()

    @patch("app.infrastructure.workers.tasks.ventas._run_expire_pending_ventas")
    @patch("app.infrastructure.workers.tasks.ventas.asyncio")
    def test_expire_pending_zero(self, mock_asyncio, mock_run_fn):
        """Retorna 0 ventas anuladas cuando no hay pendientes expiradas."""
        mock_asyncio.run.return_value = 0

        from app.infrastructure.workers.tasks.ventas import expire_pending

        result = expire_pending.apply()

        assert result.result == {"status": "ok", "ventas_anuladas": 0}
        assert result.successful()


# ─── Task Orchestration: expire_coupons ───────────────────────────────────────


class TestExpireCouponsTask:
    """Tests para la tarea Celery expire_coupons usando apply()."""

    @patch("app.infrastructure.workers.tasks.sweetcoins._run_expire_coupons")
    @patch("app.infrastructure.workers.tasks.sweetcoins.asyncio")
    def test_expire_coupons_success(self, mock_asyncio, mock_run_fn):
        """Retorna resultado exitoso cuando tiene éxito."""
        mock_asyncio.run.return_value = 12

        from app.infrastructure.workers.tasks.sweetcoins import expire_coupons

        result = expire_coupons.apply()

        assert result.result == {"status": "ok", "cupones_expirados": 12}
        assert result.successful()

    @patch("app.infrastructure.workers.tasks.sweetcoins._run_expire_coupons")
    @patch("app.infrastructure.workers.tasks.sweetcoins.asyncio")
    def test_expire_coupons_zero(self, mock_asyncio, mock_run_fn):
        """Retorna 0 cupones expirados cuando no hay cupones vencidos."""
        mock_asyncio.run.return_value = 0

        from app.infrastructure.workers.tasks.sweetcoins import expire_coupons

        result = expire_coupons.apply()

        assert result.result == {"status": "ok", "cupones_expirados": 0}
        assert result.successful()
