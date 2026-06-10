from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field, field_validator

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    page: int
    size: int
    total: int
    pages: int


class CategoriaBase(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=100)
    descripcion: str | None = Field(None, max_length=500)
    estado: bool = True

    @field_validator("nombre")
    @classmethod
    def strip_nombre(cls, v: str) -> str:
        stripped = v.strip()
        if stripped != v:
            raise ValueError("El nombre no debe tener espacios al inicio o al final")
        return stripped


class CategoriaCreate(CategoriaBase):
    pass


class CategoriaUpdate(BaseModel):
    nombre: str | None = Field(None, min_length=2, max_length=100)
    descripcion: str | None = Field(None, max_length=500)
    estado: bool | None = None

    @field_validator("nombre")
    @classmethod
    def strip_nombre(cls, v: str | None) -> str | None:
        if v is None:
            return v
        stripped = v.strip()
        if stripped != v:
            raise ValueError("El nombre no debe tener espacios al inicio o al final")
        return stripped


class CategoriaResponse(CategoriaBase):
    id_categoria: int
    slug: str | None = None

    model_config = ConfigDict(from_attributes=True)
