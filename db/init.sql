-- Se ejecuta automaticamente solo la PRIMERA vez que se crea el volumen de PostgreSQL.
CREATE TABLE IF NOT EXISTS tareas (
    id          SERIAL PRIMARY KEY,
    titulo      VARCHAR(150) NOT NULL,
    descripcion TEXT NOT NULL DEFAULT '',
    completada  BOOLEAN NOT NULL DEFAULT FALSE,
    creado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO tareas (titulo, descripcion) VALUES
    ('Instalar Docker Desktop', 'Activar WSL2 y comprobar docker --version'),
    ('Levantar la aplicacion', 'Ejecutar docker compose up --build -d');
