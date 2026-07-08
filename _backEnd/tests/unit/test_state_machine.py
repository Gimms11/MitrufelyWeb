"""
Mitrufely Web — Unit Tests para la FSM de pedidos (Fase 5 extendida).

Cubre:
  - Transiciones válidas (incluidas las nuevas EN_CAMINO→DEVUELTO y ENTREGADO→REEMBOLSADO).
  - Transiciones inválidas lanzan BusinessRuleError con mensaje útil.
  - Estados terminales identificados correctamente.
  - Helpers can_cancel / can_devolver / can_request_refund coherentes con el dict.
"""

import pytest

from app.core.exceptions import BusinessRuleError
from app.infrastructure.database.models.enums import EstadoVentaEnum
from app.modules.orders.state_machine import (
    VALID_TRANSITIONS,
    can_cancel,
    can_devolver,
    can_request_refund,
    get_progress,
    is_terminal,
    validate_transition,
)


@pytest.mark.unit
class TestStateMachineTransiciones:
    """Valida que cada transición documentada sea aceptada."""

    @pytest.mark.parametrize(
        "origen,destino",
        [
            (EstadoVentaEnum.PENDIENTE, EstadoVentaEnum.PAGADO),
            (EstadoVentaEnum.PENDIENTE, EstadoVentaEnum.CANCELADO),
            (EstadoVentaEnum.PAGADO, EstadoVentaEnum.PREPARANDO),
            (EstadoVentaEnum.PAGADO, EstadoVentaEnum.CANCELADO),
            (EstadoVentaEnum.PREPARANDO, EstadoVentaEnum.EN_CAMINO),
            (EstadoVentaEnum.PREPARANDO, EstadoVentaEnum.CANCELADO),
            (EstadoVentaEnum.EN_CAMINO, EstadoVentaEnum.ENTREGADO),
            (EstadoVentaEnum.EN_CAMINO, EstadoVentaEnum.DEVUELTO),  # NUEVO
            (EstadoVentaEnum.ENTREGADO, EstadoVentaEnum.DEVUELTO),
            (EstadoVentaEnum.ENTREGADO, EstadoVentaEnum.REEMBOLSADO),  # NUEVO
            (EstadoVentaEnum.CANCELADO, EstadoVentaEnum.REEMBOLSADO),
            (EstadoVentaEnum.DEVUELTO, EstadoVentaEnum.REEMBOLSADO),
        ],
    )
    def test_transicion_valida_no_raise(self, origen: EstadoVentaEnum, destino: EstadoVentaEnum) -> None:
        # No lanza excepción
        validate_transition(origen, destino)

    @pytest.mark.parametrize(
        "origen,destino",
        [
            (EstadoVentaEnum.PENDIENTE, EstadoVentaEnum.ENTREGADO),
            (EstadoVentaEnum.PAGADO, EstadoVentaEnum.ENTREGADO),
            (EstadoVentaEnum.PAGADO, EstadoVentaEnum.REEMBOLSADO),  # debe cancelar primero
            (EstadoVentaEnum.EN_CAMINO, EstadoVentaEnum.CANCELADO),  # en tránsito no se cancela
            (EstadoVentaEnum.ENTREGADO, EstadoVentaEnum.CANCELADO),
            (EstadoVentaEnum.CANCELADO, EstadoVentaEnum.PAGADO),
        ],
    )
    def test_transicion_invalida_lanza_business_error(
        self, origen: EstadoVentaEnum, destino: EstadoVentaEnum
    ) -> None:
        with pytest.raises(BusinessRuleError):
            validate_transition(origen, destino)

    def test_mensaje_error_incluye_estados(self) -> None:
        """El mensaje debe mencionar el estado actual y los destinos permitidos (UX)."""
        with pytest.raises(BusinessRuleError) as exc_info:
            validate_transition(EstadoVentaEnum.PAGADO, EstadoVentaEnum.ENTREGADO)

        msg = exc_info.value.message
        assert "Pagado" in msg  # etiqueta del estado actual
        assert "Preparación" in msg or "Cancelado" in msg  # destinos permitidos

    def test_error_estado_terminal_menciona_terminal(self) -> None:
        with pytest.raises(BusinessRuleError) as exc_info:
            validate_transition(EstadoVentaEnum.REEMBOLSADO, EstadoVentaEnum.PAGADO)
        assert "terminal" in exc_info.value.message.lower()


@pytest.mark.unit
class TestEstadosTerminales:
    def test_reembolsado_es_terminal(self) -> None:
        assert is_terminal(EstadoVentaEnum.REEMBOLSADO) is True

    def test_anulado_es_terminal(self) -> None:
        assert is_terminal(EstadoVentaEnum.ANULADO) is True

    @pytest.mark.parametrize(
        "estado",
        [
            EstadoVentaEnum.PENDIENTE,
            EstadoVentaEnum.PAGADO,
            EstadoVentaEnum.PREPARANDO,
            EstadoVentaEnum.EN_CAMINO,
            EstadoVentaEnum.ENTREGADO,
            EstadoVentaEnum.CANCELADO,
            EstadoVentaEnum.DEVUELTO,
        ],
    )
    def test_no_terminales(self, estado: EstadoVentaEnum) -> None:
        assert is_terminal(estado) is False


@pytest.mark.unit
class TestHelpersConsistentes:
    """Los helpers deben ser coherentes con el dict VALID_TRANSITIONS."""

    @pytest.mark.parametrize(
        "estado,esperado",
        [
            (EstadoVentaEnum.PENDIENTE, True),
            (EstadoVentaEnum.PAGADO, True),
            (EstadoVentaEnum.PREPARANDO, True),
            (EstadoVentaEnum.EN_CAMINO, False),  # en tránsito: no cancelable, sí devolvable
            (EstadoVentaEnum.ENTREGADO, False),
            (EstadoVentaEnum.CANCELADO, False),
        ],
    )
    def test_can_cancel(self, estado: EstadoVentaEnum, esperado: bool) -> None:
        assert can_cancel(estado) is esperado
        # Consistencia con el dict
        assert can_cancel(estado) == (EstadoVentaEnum.CANCELADO in VALID_TRANSITIONS[estado])

    @pytest.mark.parametrize(
        "estado,esperado",
        [
            (EstadoVentaEnum.EN_CAMINO, True),   # NUEVO: tránsito que retorna
            (EstadoVentaEnum.ENTREGADO, True),
            (EstadoVentaEnum.PENDIENTE, False),
            (EstadoVentaEnum.PAGADO, False),
        ],
    )
    def test_can_devolver(self, estado: EstadoVentaEnum, esperado: bool) -> None:
        assert can_devolver(estado) is esperado
        assert can_devolver(estado) == (EstadoVentaEnum.DEVUELTO in VALID_TRANSITIONS[estado])

    @pytest.mark.parametrize(
        "estado,esperado",
        [
            (EstadoVentaEnum.ENTREGADO, True),   # NUEVO: reembolso directo
            (EstadoVentaEnum.CANCELADO, True),
            (EstadoVentaEnum.DEVUELTO, True),
            (EstadoVentaEnum.PAGADO, False),     # no directo: hay que cancelar/devolver antes
            (EstadoVentaEnum.PENDIENTE, False),
        ],
    )
    def test_can_request_refund(self, estado: EstadoVentaEnum, esperado: bool) -> None:
        assert can_request_refund(estado) is esperado
        assert can_request_refund(estado) == (EstadoVentaEnum.REEMBOLSADO in VALID_TRANSITIONS[estado])


@pytest.mark.unit
class TestProgreso:
    @pytest.mark.parametrize(
        "estado,esperado",
        [
            (EstadoVentaEnum.PENDIENTE, 10),
            (EstadoVentaEnum.PAGADO, 25),
            (EstadoVentaEnum.PREPARANDO, 50),
            (EstadoVentaEnum.EN_CAMINO, 75),
            (EstadoVentaEnum.ENTREGADO, 100),
            (EstadoVentaEnum.CANCELADO, 0),
            (EstadoVentaEnum.REEMBOLSADO, 0),
        ],
    )
    def test_get_progress(self, estado: EstadoVentaEnum, esperado: int) -> None:
        assert get_progress(estado) == esperado
