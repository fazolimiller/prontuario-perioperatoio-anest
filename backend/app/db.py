import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# PostgreSQL no Docker; SQLite local para testes rápidos.
URL = os.getenv("DATABASE_URL", "sqlite:///./perianest.db")
engine = create_engine(URL, connect_args={"check_same_thread": False} if URL.startswith("sqlite") else {})
Sessao = sessionmaker(engine, expire_on_commit=False)
