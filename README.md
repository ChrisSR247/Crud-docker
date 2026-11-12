# API de Tareas (CRUD) con Docker

API REST para gestionar tareas, hecha con **Node.js + Express** y **PostgreSQL**, ejecutada con **Docker Compose**. Esta guía permite que otra persona la levante en **Windows** sin instalar Node ni PostgreSQL.

## 1. Requisitos

| Requisito | Detalle |
|---|---|
| Sistema operativo | Windows 10 (22H2) o Windows 11, 64 bits |
| Docker Desktop | Con el motor **WSL 2** activado (`Settings > General > Use the WSL 2 based engine`) |
| Virtualización | Habilitada en la BIOS/UEFI (Administrador de tareas > Rendimiento > CPU > "Virtualización: Habilitada") |
| Git | Para clonar el repositorio |
| Puertos libres | `3000` (API) y `5432` (PostgreSQL). Se pueden cambiar en `.env` |

Comprobar la instalación (PowerShell):

```powershell
docker --version
docker compose version
git --version
```

## 2. Estructura del proyecto

```
Crud-docker/
├── app/
│   ├── Dockerfile          # Imagen de la API (node:22-alpine)
│   ├── .dockerignore
│   ├── package.json
│   ├── package-lock.json
│   └── server.js           # API REST (endpoints del CRUD)
├── db/
│   └── init.sql            # Crea la tabla "tareas" y datos iniciales de prueba
├── docker-compose.yml      # Definición de servicios: db (PostgreSQL) y api (Node.js)
├── .env.example            # Plantilla de variables de entorno (sin credenciales reales)
├── .gitignore              # Excluye .env y node_modules del control de versiones
└── README.md               # Guía completa de despliegue y uso reproducible
```

## 3. Preparar las variables de entorno

1. Clonar el repositorio y entrar a la carpeta:

   ```powershell
   git clone https://github.com/ChrisSR247/Crud-docker.git
   cd Crud-docker
   ```

2. Copiar la plantilla:

   ```powershell
   Copy-Item .env.example .env
   ```

   (En CMD: `copy .env.example .env`)

3. Abrir `.env` y cambiar al menos `POSTGRES_PASSWORD`.

| Variable | Descripción | Valor de ejemplo |
|---|---|---|
| `POSTGRES_USER` | Usuario de PostgreSQL | `usuario_ejemplo` |
| `POSTGRES_PASSWORD` | Contraseña de PostgreSQL | `cambia_esta_clave` |
| `POSTGRES_DB` | Nombre de la base de datos | `tareas_db` |
| `API_PORT` | Puerto del equipo donde se publica la API | `3000` |
| `DB_HOST_PORT` | Puerto del equipo donde se publica PostgreSQL | `5432` |

> El archivo `.env` contiene credenciales y **no debe subirse al repositorio** (ya está en `.gitignore`).

## 4. Construir, iniciar y detener

Ejecutar siempre desde la carpeta donde está `docker-compose.yml`, con **Docker Desktop abierto**.

| Acción | Comando |
|---|---|
| Construir las imágenes | `docker compose build` |
| Construir e iniciar en segundo plano | `docker compose up --build -d` |
| Ver el estado de los contenedores | `docker compose ps` |
| Ver los logs | `docker compose logs -f` |
| Detener sin borrar datos | `docker compose stop` |
| Volver a iniciar | `docker compose start` |
| Detener y eliminar contenedores (conserva los datos) | `docker compose down` |
| Detener, eliminar contenedores **y borrar los datos** | `docker compose down -v` |

Primer arranque:

```powershell
docker compose up --build -d
docker compose ps
```

Los dos servicios (`tareas_db` y `tareas_api`) deben aparecer en estado `Up`; `tareas_db` además debe mostrar `(healthy)`.

Comprobar la API:

```powershell
curl.exe http://localhost:3000/health
```

Respuesta esperada: `{"estado":"ok","base_de_datos":"conectada"}`

## 5. Inicialización de la base de datos

La base de datos se inicializa **sola** la primera vez que se levanta el proyecto: PostgreSQL ejecuta `db/init.sql`, que crea la tabla `tareas` e inserta dos registros de ejemplo.

Importante: ese script se ejecuta **solo cuando el volumen `pgdata` está vacío**. Si se modifica `init.sql` o las credenciales y se necesita reiniciar desde cero:

```powershell
docker compose down -v
docker compose up --build -d
```

Verificar la tabla dentro del contenedor (sustituir usuario y base por los valores de tu `.env`):

```powershell
docker compose exec db psql -U usuario_ejemplo -d tareas_db -c "SELECT * FROM tareas;"
```

## 6. Ejemplos de solicitudes al CRUD

Base: `http://localhost:3000` (cambiar el puerto si se modificó `API_PORT`).

| Operación | Método y ruta | Respuesta |
|---|---|---|
| Crear | `POST /tareas` | `201` con la tarea creada |
| Listar | `GET /tareas` | `200` con la lista |
| Obtener una | `GET /tareas/{id}` | `200` o `404` |
| Actualizar | `PUT /tareas/{id}` | `200` o `404` |
| Eliminar | `DELETE /tareas/{id}` | `204` o `404` |

Campos de una tarea: `titulo` (obligatorio), `descripcion`, `completada` (true/false).

### Con PowerShell (`Invoke-RestMethod`)

```powershell
# Crear
$body = @{ titulo = "Estudiar Docker"; descripcion = "Practica de contenedores" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://localhost:3000/tareas -ContentType "application/json" -Body $body

# Listar
Invoke-RestMethod -Uri http://localhost:3000/tareas

# Obtener la tarea 1
Invoke-RestMethod -Uri http://localhost:3000/tareas/1

# Actualizar (marcar como completada)
$body = @{ completada = $true } | ConvertTo-Json
Invoke-RestMethod -Method Put -Uri http://localhost:3000/tareas/1 -ContentType "application/json" -Body $body

# Eliminar
Invoke-RestMethod -Method Delete -Uri http://localhost:3000/tareas/1
```

### Con `curl.exe`

En Windows PowerShell hay que escribir `curl.exe` (no `curl`, ya que este último es un alias interno de `Invoke-WebRequest`). Para evitar problemas de escape de comillas en PowerShell con el parámetro `-d`, se recomienda pasar el JSON a través del canal de entrada (`stdin`) o usar CMD:

**Opción A: PowerShell con pipe stdin (Recomendada para curl en PowerShell):**

```powershell
# Crear
'{"titulo":"Estudiar Docker","descripcion":"Practica de contenedores"}' | curl.exe -s -X POST http://localhost:3000/tareas -H "Content-Type: application/json" -d '@-'

# Listar
curl.exe -s http://localhost:3000/tareas

# Obtener
curl.exe -s http://localhost:3000/tareas/1

# Actualizar (marcar como completada)
'{"completada":true}' | curl.exe -s -X PUT http://localhost:3000/tareas/1 -H "Content-Type: application/json" -d '@-'

# Eliminar
curl.exe -s -X DELETE http://localhost:3000/tareas/1
```

**Opción B: Símbolo del sistema (CMD):**

```cmd
:: Crear
curl -X POST http://localhost:3000/tareas -H "Content-Type: application/json" -d "{\"titulo\":\"Estudiar Docker\",\"descripcion\":\"Practica de contenedores\"}"

:: Listar
curl http://localhost:3000/tareas

:: Actualizar
curl -X PUT http://localhost:3000/tareas/1 -H "Content-Type: application/json" -d "{\"completada\":true}"

:: Eliminar
curl -X DELETE http://localhost:3000/tareas/1
```

## 7. Errores frecuentes y soluciones

### Error 1: `no configuration file provided: not found` al ejecutar docker compose

- **Mensaje:** `no configuration file provided: not found`.
- **Causa:** el comando se ejecutó en una carpeta diferente a la que contiene `docker-compose.yml` (por ejemplo, fuera del repositorio clonado).
- **Solución:** verificar la ruta actual con `pwd` o `Get-Location` y acceder al directorio raíz del proyecto con `cd Crud-docker` antes de ejecutar `docker compose`.

### Error 2: `error: src refspec main does not match any` al hacer git push

- **Mensaje:** `error: src refspec main does not match any` / `failed to push some refs to '...'`.
- **Causa:** se intentó subir a GitHub antes de crear el primer commit o cuando la rama local se llama `master` en lugar de `main`.
- **Solución:** registrar los cambios e inicializar la rama:
  ```powershell
  git add .
  git commit -m "Inicializar proyecto CRUD dockerizado"
  git branch -M main
  git push -u origin main
  ```

### Error 3: Docker Desktop no está en ejecución

- **Mensaje:** `error during connect: ... open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified` o `Cannot connect to the Docker daemon`.
- **Causa:** el motor de Docker no está iniciado.
- **Solución:** abrir Docker Desktop y esperar a que indique *Engine running*. Verificar con `docker info` y repetir el comando.

### Error 4: Puerto ya en uso

- **Mensaje:** `Bind for 0.0.0.0:5432 failed: port is already allocated` o `ports are not available: ... Only one usage of each socket address`.
- **Causa:** otro programa (por ejemplo, un PostgreSQL local o IIS en Windows) ya usa el puerto `5432` o `3000`.
- **Solución:** identificar el proceso con `netstat -ano | findstr :5432`, o cambiar el puerto en `.env` (por ejemplo `DB_HOST_PORT=5433` o `API_PORT=3001`) y volver a ejecutar `docker compose up -d`.

### Error 5: Falta el archivo `.env` o sus variables

- **Mensaje:** `The "POSTGRES_USER" variable is not set. Defaulting to a blank string` o el contenedor `tareas_db` se detiene con `Database is uninitialized and superuser password is not specified`.
- **Causa:** no se creó `.env` a partir de `.env.example`, o tiene variables vacías.
- **Solución:** ejecutar `Copy-Item .env.example .env`, verificar los valores y volver a levantar con `docker compose up --build -d`.

### Error 6: `password authentication failed` o `relation "tareas" does not exist`

- **Causa:** el volumen `pgdata` ya existía de una ejecución anterior. PostgreSQL ignora los cambios de usuario/contraseña de `.env` y no vuelve a ejecutar `init.sql` si el volumen ya tiene datos.
- **Solución:** borrar el volumen y recrear todo (esto reinicia los datos):
  ```powershell
  docker compose down -v
  docker compose up --build -d
  ```

### Error 7: WSL 2 o virtualización no disponibles

- **Mensaje:** Docker Desktop muestra `WSL 2 installation is incomplete` o `Virtualization support not detected`.
- **Causa:** WSL 2 no está instalado o la virtualización está desactivada en la BIOS/UEFI.
- **Solución:** en PowerShell como administrador ejecutar `wsl --install`, reiniciar el equipo y, si persiste, activar la virtualización (Intel VT-x / AMD-V) en la BIOS/UEFI.

### Error 8: `curl` falla en PowerShell con `-H` o `-X`

- **Mensaje:** `Invoke-WebRequest : Cannot bind parameter 'Headers'`.
- **Causa:** en Windows PowerShell, `curl` es un alias de `Invoke-WebRequest`, no del programa curl real.
- **Solución:** usar `curl.exe` o `Invoke-RestMethod`, como en la sección 6.

## 8. Limpieza total

Para eliminar contenedores, volumen y redes del proyecto:

```powershell
docker compose down -v
```

Para además borrar la imagen construida de la API:

```powershell
docker compose down -v --rmi local
```
