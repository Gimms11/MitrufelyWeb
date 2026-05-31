import io
from unittest.mock import AsyncMock, patch
import pytest
from fastapi import HTTPException
from PIL import Image

from app.core.config import settings
from app.infrastructure.storage.cloudinary_service import CloudinaryService


# Helper para generar una imagen ficticia en bytes
def create_dummy_image(mode: str = "RGB", size: tuple = (100, 100), fmt: str = "PNG") -> bytes:
    img_io = io.BytesIO()
    # Si el modo soporta transparencia, usar una tupla RGBA con transparencia real
    color = "red" if mode in ("RGB", "L") else (255, 0, 0, 128)
    img = Image.new(mode, size, color=color)
    img.save(img_io, format=fmt)
    return img_io.getvalue()


@pytest.fixture
def clean_cloudinary_settings():
    """Asegura que el entorno tenga configuraciones estables durante los tests unitarios."""
    with patch.object(settings, "APP_ENV", "development"):
        yield settings


class TestStorageService:

    @pytest.mark.asyncio
    async def test_optimize_image_preserves_alpha_transparency(self, clean_cloudinary_settings) -> None:
        """Valida que Pillow conserve la transparencia (RGBA) al optimizar a WebP."""
        service = CloudinaryService()
        rgba_image_bytes = create_dummy_image(mode="RGBA", size=(900, 900), fmt="PNG")

        # Invocar la optimización en memoria
        optimized_bytes = service._optimize_image(rgba_image_bytes)

        # Reabrir la imagen optimizada para verificar sus propiedades
        optimized_img = Image.open(io.BytesIO(optimized_bytes))
        
        # Validaciones
        assert optimized_img.format == "WEBP"
        # Debe conservar el canal RGBA para transparencia
        assert optimized_img.mode == "RGBA"
        # Debe haberse redimensionado proporcionalmente a un máximo de 800px
        assert optimized_img.width == 800
        assert optimized_img.height == 800

    @pytest.mark.asyncio
    async def test_optimize_image_converts_standard_to_rgb(self, clean_cloudinary_settings) -> None:
        """Valida que una imagen sin transparencias se guarde como RGB estándar en WebP."""
        service = CloudinaryService()
        rgb_image_bytes = create_dummy_image(mode="RGB", size=(100, 100), fmt="JPEG")

        optimized_bytes = service._optimize_image(rgb_image_bytes)
        optimized_img = Image.open(io.BytesIO(optimized_bytes))

        assert optimized_img.format == "WEBP"
        assert optimized_img.mode == "RGB"

    @pytest.mark.asyncio
    async def test_upload_image_invalid_mime_type(self, clean_cloudinary_settings) -> None:
        """Valida que se rechacen archivos con tipo MIME no permitido."""
        service = CloudinaryService()
        txt_bytes = b"contenido de texto falso"

        with pytest.raises(HTTPException) as exc_info:
            await service.upload_image(
                file_bytes=txt_bytes,
                filename="archivo.txt",
                content_type="text/plain",
                folder="mitrufely/general"
            )

        assert exc_info.value.status_code == 400
        assert "Tipo de archivo no permitido" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_upload_image_exceeds_size_limit(self, clean_cloudinary_settings) -> None:
        """Valida que se lance error 413 si la imagen excede los 5MB de tamaño."""
        service = CloudinaryService()
        # Generar un buffer de bytes grande de 6MB (supera el límite de 5MB)
        large_bytes = b"\0" * (6 * 1024 * 1024)

        with pytest.raises(HTTPException) as exc_info:
            await service.upload_image(
                file_bytes=large_bytes,
                filename="pesada.jpg",
                content_type="image/jpeg",
                folder="mitrufely/general"
            )

        assert exc_info.value.status_code == 413
        assert "El archivo supera el límite" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_upload_image_corrupt_binary_fails_pillow_verification(self, clean_cloudinary_settings) -> None:
        """Valida que se lance un 400 si el binario del archivo está corrupto."""
        service = CloudinaryService()
        corrupt_bytes = b"esta no es una imagen real, es binario basura"

        with pytest.raises(HTTPException) as exc_info:
            await service.upload_image(
                file_bytes=corrupt_bytes,
                filename="foto.jpg",
                content_type="image/jpeg",
                folder="mitrufely/general"
            )

        assert exc_info.value.status_code == 400
        assert "El archivo binario está corrupto" in exc_info.value.detail

    @pytest.mark.asyncio
    @patch("cloudinary.uploader.upload")
    async def test_upload_image_server_down_returns_503(self, mock_upload, clean_cloudinary_settings) -> None:
        """Valida que si Cloudinary se cae o da timeout, la API retorne un error 503."""
        # Forzar que no use el mock local simulando que sí hay credenciales
        with patch.object(settings, "CLOUDINARY_CLOUD_NAME", "real-name"), \
             patch.object(settings, "CLOUDINARY_API_KEY", "real-key"), \
             patch.object(settings, "CLOUDINARY_API_SECRET", "real-secret"):
            
            service = CloudinaryService()
            assert service.mock_mode is False

            # Mockear la llamada de subida de Cloudinary para que lance un error externo
            mock_upload.side_effect = Exception("Cloudinary Connection Timeout / DNS Error")

            image_bytes = create_dummy_image()

            with pytest.raises(HTTPException) as exc_info:
                await service.upload_image(
                    file_bytes=image_bytes,
                    filename="trufa.jpg",
                    content_type="image/jpeg",
                    folder="mitrufely/products"
                )

            assert exc_info.value.status_code == 503
            assert "Error de comunicación con el servidor" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_mock_mode_fallback_works_when_credentials_are_empty(self, clean_cloudinary_settings) -> None:
        """Valida que en entornos locales/tests sin credenciales, el mock mode provea URLs seguras."""
        # Forzar credenciales vacías en test/dev
        with patch.object(settings, "CLOUDINARY_CLOUD_NAME", None), \
             patch.object(settings, "CLOUDINARY_API_KEY", None), \
             patch.object(settings, "CLOUDINARY_API_SECRET", None):
            
            service = CloudinaryService()
            assert service.mock_mode is True

            image_bytes = create_dummy_image()
            result = await service.upload_image(
                file_bytes=image_bytes,
                filename="trufa.jpg",
                content_type="image/jpeg",
                folder="mitrufely/products"
            )

            # Debe generar una URL simulada y un public_id válido con UUID
            assert "secure_url" in result
            assert "public_id" in result
            assert "https://res.cloudinary.com/dummy/image/upload/mitrufely/products/producto_" in result["secure_url"]
            assert result["public_id"].startswith("mitrufely/products/producto_")
