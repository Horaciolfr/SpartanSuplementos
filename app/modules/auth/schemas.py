from pydantic import BaseModel, EmailStr, ConfigDict, Field
from typing import Optional

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    rol: str

class UsuarioOut(BaseModel):
    id_usuario: int
    numero_documento: str
    nombres: str
    apellidos: str
    email: EmailStr
    rol: str
    esta_verificado: Optional[bool] = True
    objetivo: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class RegistroClienteIn(BaseModel):
    nombres: str = Field(..., min_length=2, max_length=100)
    apellidos: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=100)
    numero_documento: Optional[str] = Field(None, max_length=20)
    id_genero: Optional[int] = None

class VerificarCodigoIn(BaseModel):
    email: EmailStr
    codigo: str = Field(..., min_length=4, max_length=10)

class ReenviarCodigoIn(BaseModel):
    email: EmailStr

class SolicitarRecuperacionIn(BaseModel):
    email: EmailStr

class RestablecerPasswordIn(BaseModel):
    email: EmailStr
    codigo: str = Field(..., min_length=4, max_length=10)
    nueva_password: str = Field(..., min_length=6, max_length=100)

class AuthMessageResponse(BaseModel):
    message: str
    email: Optional[str] = None
    requiere_verificacion: Optional[bool] = None

