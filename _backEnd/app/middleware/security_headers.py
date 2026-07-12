"""
Mifrufely Web — Security Headers Middleware
Injects standard HTTP security response headers on every response.

Resuelve ZAP-2 (CWE-693): "Falta encabezado X-Content-Type-Options".
La alerta de ZAP era "systemic" (afectaba a toda la API) porque no
existía ningún middleware que agregara cabeceras de seguridad.

Cabeceras agregadas:
  - X-Content-Type-Options: nosniff   → previene MIME-sniffing
  - X-Frame-Options: DENY             → previene clickjacking
  - Strict-Transport-Security         → fuerza HTTPS (HSTS)
  - Content-Security-Policy           → previene XSS / inyección de contenido
  - Referrer-Policy                   → controla filtrado de URLs vía Referer
  - Permissions-Policy                → restringe APIs del navegador
"""

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Adds security-related HTTP headers to every response.

    In production, HSTS is enforced with a long max-age and includeSubDomains.
    In development, HSTS is omitted to allow plain HTTP for local testing.
    """

    async def dispatch(
        self,
        request: Request,
        call_next: RequestResponseEndpoint,
    ) -> Response:
        response = await call_next(request)

        # ── Cabeceras que aplican a TODOS los entornos ────────────────────────
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = (
            "geolocation=(), microphone=(), camera=(), payment=()"
        )

        # ── Content-Security-Policy ───────────────────────────────────────────
        # API REST que sirve JSON: bloqueamos frames, plugins y mixed content.
        # No permitimos 'unsafe-inline' porque la API no sirve HTML propio.
        response.headers["Content-Security-Policy"] = (
            "default-src 'none'; frame-ancestors 'none'"
        )

        # ── HSTS solo en producción (detrás de HTTPS) ─────────────────────────
        # En desarrollo usamos HTTP, así que HSTS rompería el acceso local.
        from app.core.config import settings

        if settings.is_production:
            response.headers["Strict-Transport-Security"] = (
                "max-age=63072000; includeSubDomains; preload"
            )

        return response
