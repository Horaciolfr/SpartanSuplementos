from pydantic import BaseModel, EmailStr, ConfigDict
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

    model_config = ConfigDict(from_attributes=True)
