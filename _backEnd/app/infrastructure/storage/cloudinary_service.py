import asyncio
import io
from uuid import uuid4
from fastapi import HTTPException, status
import structlog
from PIL import Image

import cloudinary
import cloudinary.uploader
from app.core.config import settings

logger = structlog.get_logger()


class CloudinaryService:
    """
    Servicio empresarial para la gestión de imágenes con Cloudinary y Pillow.
    Proporciona optimización en memoria, validaciones estrictas y operaciones asíncronas no bloqueantes.
    """

    MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
    ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}

    def __init__(self) -> None:
        self.mock_mode = False

        # Verificar credenciales de Cloudinary
        has_credentials = all([
            settings.CLOUDINARY_CLOUD_NAME,
            settings.CLOUDINARY_API_KEY,
            settings.CLOUDINARY_API_SECRET
        ])

        if has_credentials:
            cloudinary.config(
                cloud_name=settings.CLOUDINARY_CLOUD_NAME,
                api_key=settings.CLOUDINARY_API_KEY,
                api_secret=settings.CLOUDINARY_API_SECRET,
                secure=True
            )
            logger.info("Cloudinary configurado exitosamente.")
        else:
            if settings.APP_ENV == "production":
                # Esto es preventivo, ya que el validador de Settings lo frena al arrancar,
                # pero garantiza seguridad extrema contra accesos directos en producción.
                raise ValueError("Las credenciales de Cloudinary son mandatorias en producción.")
            
            self.mock_mode = True
            logger.warning(
                "Credenciales de Cloudinary incompletas. El almacenamiento funcionará en MOCK_MODE (simulado)."
            )

    def _optimize_image(self, file_bytes: bytes) -> bytes:
        """
        Optimiza la imagen en memoria usando Pillow.
        - Preserva canal Alpha (transparencias) si existe.
        - Redimensiona proporcionalmente a un máximo de 800x800px.
        - Convierte y comprime en formato WebP con calidad 85.
        """
        try:
            image = Image.open(io.BytesIO(file_bytes))
            # verify() comprueba si el archivo está corrupto.
            # Nota: verify() invalida el objeto image, por lo que es necesario reabrirlo si pasa con éxito.
            image.verify()
            image = Image.open(io.BytesIO(file_bytes))
        except Exception as e:
            logger.error("Error al abrir o verificar la imagen con Pillow", error=str(e))
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El archivo binario está corrupto o no es una imagen válida."
            )

        # ── Manejo de transparencias (Canal Alpha) ───────────────────────────
        if image.mode in ("RGBA", "LA") or (image.mode == "P" and "transparency" in image.info):
            image = image.convert("RGBA")
        else:
            image = image.convert("RGB")

        # ── Redimensionado Proporcional (Max 800x800) ────────────────────────
        max_size = 800
        width, height = image.size
        if width > max_size or height > max_size:
            if width > height:
                new_width = max_size
                new_height = int(height * (max_size / width))
            else:
                new_height = max_size
                new_width = int(width * (max_size / height))
            
            image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
            logger.debug("Imagen redimensionada", original=f"{width}x{height}", optimized=f"{new_width}x{new_height}")

        # ── Compresión y Conversión a WebP ───────────────────────────────────
        output_buffer = io.BytesIO()
        image.save(output_buffer, format="WEBP", quality=85)
        optimized_bytes = output_buffer.getvalue()
        
        logger.debug(
            "Imagen optimizada en memoria", 
            original_size=len(file_bytes), 
            optimized_size=len(optimized_bytes)
        )
        return optimized_bytes

    async def upload_image(self, file_bytes: bytes, filename: str, content_type: str, folder: str = "mitrufely/general") -> dict:
        """
        Sube una imagen optimizándola y enviándola a Cloudinary de manera asíncrona.
        Retorna un diccionario con {'secure_url', 'public_id'}.
        """
        # 1. Validación de tamaño física previa
        if len(file_bytes) > self.MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="El archivo supera el límite de tamaño permitido (5MB)."
            )

        # 2. Validación MIME
        if content_type not in self.ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tipo de archivo no permitido. Solo se permiten formatos JPEG, PNG y WebP."
            )

        # 3. Optimización en memoria
        optimized_bytes = self._optimize_image(file_bytes)

        # 4. Generación de public_id único con UUID para evitar colisiones
        unique_id = uuid4().hex
        # Determinar el nombre del archivo según el folder
        prefix = "file"
        if "products" in folder:
            prefix = "producto"
        elif "packages" in folder:
            prefix = "paquete"
        elif "users" in folder:
            prefix = "usuario"
        elif "banners" in folder:
            prefix = "banner"

        public_id = f"{folder}/{prefix}_{unique_id}"

        # 5. Envío a Cloudinary (o Mock)
        if self.mock_mode:
            logger.info("Simulando subida de imagen (Mock Mode)", folder=folder, public_id=public_id)
            return {
                "secure_url": f"https://res.cloudinary.com/dummy/image/upload/{public_id}.webp",
                "public_id": public_id
            }

        try:
            # Envolver la llamada síncrona en un hilo de trabajo no bloqueante
            def _upload():
                return cloudinary.uploader.upload(
                    optimized_bytes,
                    public_id=public_id,
                    format="webp",
                    overwrite=True
                )
            
            response = await asyncio.to_thread(_upload)
            logger.info("Imagen subida a Cloudinary exitosamente", public_id=response.get("public_id"))
            return {
                "secure_url": response.get("secure_url"),
                "public_id": response.get("public_id")
            }
        except Exception as e:
            logger.error("Error al subir imagen a Cloudinary", error=str(e))
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Error de comunicación con el servidor de almacenamiento externo Cloudinary."
            )

    async def delete_image(self, public_id: str) -> None:
        """
        Elimina de manera asíncrona una imagen de Cloudinary mediante su public_id.
        """
        if not public_id:
            return

        if self.mock_mode:
            logger.info("Simulando eliminación de imagen (Mock Mode)", public_id=public_id)
            return

        try:
            def _delete():
                return cloudinary.uploader.destroy(public_id)
            
            response = await asyncio.to_thread(_delete)
            logger.info("Intento de borrado en Cloudinary completado", public_id=public_id, result=response.get("result"))
        except Exception as e:
            # En eliminación, registramos el error en el log en lugar de lanzar excepción crítica
            # para no romper flujos de borrado en cascada, pero permitiendo auditoría.
            logger.error("Error no crítico al eliminar imagen en Cloudinary", public_id=public_id, error=str(e))
