from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch
import pytest
from sqlalchemy.exc import SQLAlchemyError
from fastapi import UploadFile

from app.infrastructure.database.models.catalogo import Paquete, PaqueteProducto
from app.modules.products.schemas import PaqueteCreate, PaqueteUpdate, PaqueteProductoCreate
from app.modules.products.service import PaqueteService


@pytest.fixture
def mock_repo() -> AsyncMock:
    return AsyncMock()


@pytest.fixture
def mock_storage_service() -> AsyncMock:
    service = AsyncMock()
    # Simular comportamiento exitoso por defecto
    service.upload_image.return_value = {
        "secure_url": "https://res.cloudinary.com/dummy/mitrufely/packages/paquete_new.webp",
        "public_id": "mitrufely/packages/paquete_new"
    }
    service.delete_image = AsyncMock()
    return service


@pytest.fixture
def mock_upload_file() -> MagicMock:
    file = MagicMock(spec=UploadFile)
    file.filename = "combo_navidad.png"
    file.content_type = "image/png"
    file.read = AsyncMock(return_value=b"bytes ficticios de imagen")
    return file


class TestRollbackIntegration:

    @pytest.mark.asyncio
    async def test_create_with_image_db_fails_performs_cloudinary_rollback(
        self, mock_repo, mock_storage_service, mock_upload_file
    ) -> None:
        """
        Valida que si la creación de base de datos falla (ej. SQLAlchemyError),
        el servicio atrape el error, haga rollback y elimine activamente la imagen subida de Cloudinary.
        """
        service = PaqueteService(repo=mock_repo)

        # Forzar un fallo en la base de datos (repositorio) al crear
        mock_repo.create.side_effect = SQLAlchemyError("Error de integridad física de base de datos")

        dto = PaqueteCreate(
            nombre="Combo Rollback",
            slug="combo-rollback",
            descripcion="Descripción de prueba",
            productos=[
                PaqueteProductoCreate(id_producto=1, cantidad=2),
                PaqueteProductoCreate(id_producto=2, cantidad=1)
            ]
        )

        # Invocamos la creación que fallará en BD
        with pytest.raises(SQLAlchemyError):
            await service.create_with_image(
                dto=dto,
                image_file=mock_upload_file,
                storage_service=mock_storage_service
            )

        # Validaciones de atomicidad
        # 1. Se debe haber llamado a la subida de Cloudinary
        mock_storage_service.upload_image.assert_called_once()
        # 2. Se debe haber intentado insertar en el repositorio
        mock_repo.create.assert_called_once()
        # 3. ROLLBACK CLOUDINARY: Debe haberse invocado delete_image con la nueva imagen subida
        mock_storage_service.delete_image.assert_called_once_with("mitrufely/packages/paquete_new")

    @pytest.mark.asyncio
    async def test_update_with_image_success_deletes_old_image_from_cloudinary(
        self, mock_repo, mock_storage_service, mock_upload_file
    ) -> None:
        """
        Valida que en una actualización exitosa de foto, tras consolidar los cambios en BD,
        se elimine correctamente la imagen anterior en Cloudinary usando su public_id.
        """
        service = PaqueteService(repo=mock_repo)

        # Mockear paquete existente en la BD con imagen previa
        paquete_existente = Paquete(
            id_paquete=100,
            nombre="Combo Antiguo",
            slug="combo-antiguo",
            imagen_url="https://res.cloudinary.com/dummy/mitrufely/packages/paquete_old.webp",
            cloudinary_public_id="mitrufely/packages/paquete_old",
            estado=True,
            fecha_creacion=datetime.now(),
            fecha_actualizacion=datetime.now()
        )
        # Mockear las relaciones de productos para evitar errores de mapeo
        paquete_existente.productos = []

        mock_repo.get_by_id.return_value = paquete_existente
        # Simular guardado exitoso en el repo
        mock_repo.update.return_value = paquete_existente

        dto = PaqueteUpdate(
            nombre="Combo Renovado",
            slug="combo-renovado"
        )

        # Ejecutar la edición con nueva foto
        result = await service.update_with_image(
            pk=100,
            dto=dto,
            image_file=mock_upload_file,
            storage_service=mock_storage_service
        )

        # Validaciones
        assert result is not None
        assert result.nombre == "Combo Renovado"
        assert result.cloudinary_public_id == "mitrufely/packages/paquete_new"
        assert result.imagen_url == "https://res.cloudinary.com/dummy/mitrufely/packages/paquete_new.webp"

        # 1. Se subió la nueva foto
        mock_storage_service.upload_image.assert_called_once()
        # 2. Se actualizó la BD
        mock_repo.update.assert_called_once()
        # 3. REEMPLAZO CLOUDINARY: Se borró la foto antigua usando el public_id anterior
        mock_storage_service.delete_image.assert_called_once_with("mitrufely/packages/paquete_old")

    @pytest.mark.asyncio
    async def test_update_with_image_db_fails_performs_cloudinary_rollback(
        self, mock_repo, mock_storage_service, mock_upload_file
    ) -> None:
        """
        Valida que si en una actualización la base de datos falla, el sistema no borre
        la imagen anterior y elimine de inmediato la nueva imagen recién subida a Cloudinary.
        """
        service = PaqueteService(repo=mock_repo)

        paquete_existente = Paquete(
            id_paquete=100,
            nombre="Combo Antiguo",
            slug="combo-antiguo",
            imagen_url="https://res.cloudinary.com/dummy/mitrufely/packages/paquete_old.webp",
            cloudinary_public_id="mitrufely/packages/paquete_old",
            estado=True,
            fecha_creacion=datetime.now(),
            fecha_actualizacion=datetime.now()
        )
        paquete_existente.productos = []

        mock_repo.get_by_id.return_value = paquete_existente
        # Forzar fallo en el commit del update
        mock_repo.update.side_effect = SQLAlchemyError("Error en commit")

        dto = PaqueteUpdate(nombre="Combo Falla")

        with pytest.raises(SQLAlchemyError):
            await service.update_with_image(
                pk=100,
                dto=dto,
                image_file=mock_upload_file,
                storage_service=mock_storage_service
            )

        # Validaciones de seguridad
        # 1. Se subió la nueva foto
        mock_storage_service.upload_image.assert_called_once()
        # 2. ROLLBACK CLOUDINARY: Se eliminó la nueva imagen subida (mitrufely/packages/paquete_new)
        mock_storage_service.delete_image.assert_called_once_with("mitrufely/packages/paquete_new")
        # 3. La imagen antigua (mitrufely/packages/paquete_old) NO fue eliminada
        assert mock_storage_service.delete_image.call_count == 1
