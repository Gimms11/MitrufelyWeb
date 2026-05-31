from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
import structlog
from app.infrastructure.storage.cloudinary_service import CloudinaryService
from app.security.dependencies import require_admin

logger = structlog.get_logger()
router = APIRouter(prefix="/storage", tags=["Storage"])

# Patrón Singleton para el servicio de almacenamiento de infraestructura
_storage_service = CloudinaryService()


def get_storage_service() -> CloudinaryService:
    return _storage_service


@router.post(
    "/upload",
    status_code=status.HTTP_201_CREATED,
    summary="Subir imagen general (Banners / WYSIWYG / CMS)",
    dependencies=[Depends(require_admin)],
)
async def upload_general_image(
    file: UploadFile = File(...),
    folder: str = Form("mitrufely/general"),
    service: CloudinaryService = Depends(get_storage_service),
) -> dict:
    """
    Endpoint para que los administradores suban recursos multimedia de uso general 
    (banners, imágenes de CMS, posts, etc.). 
    Optimiza la imagen automáticamente en memoria antes de la subida.
    """
    # Validar que no se intente subir a directorios ajenos al prefijo mitrufely/
    allowed_folders = {"mitrufely/general", "mitrufely/banners", "mitrufely/cms"}
    if folder not in allowed_folders:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Carpeta de destino no permitida. Carpetas válidas: {list(allowed_folders)}"
        )

    logger.info("Petición de subida general de imagen recibida", filename=file.filename, folder=folder)

    # Leer bytes del archivo de forma asíncrona
    file_bytes = await file.read()

    # Subir y optimizar la imagen
    result = await service.upload_image(
        file_bytes=file_bytes,
        filename=file.filename or "imagen",
        content_type=file.content_type or "image/jpeg",
        folder=folder
    )

    return {
        "imagen_url": result["secure_url"],
        "cloudinary_public_id": result["public_id"],
        "message": "Imagen subida y optimizada con éxito."
    }
