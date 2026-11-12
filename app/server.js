const express = require("express");
const { Pool } = require("pg");

const requeridas = ["DB_HOST", "DB_PORT", "POSTGRES_USER", "POSTGRES_PASSWORD", "POSTGRES_DB"];
const faltantes = requeridas.filter((v) => !process.env[v]);
if (faltantes.length > 0) {
  console.error(`Faltan variables de entorno: ${faltantes.join(", ")}`);
  process.exit(1);
}

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
});

const app = express();
app.use(express.json());

// Salud del servicio y de la conexión a la base de datos
app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ estado: "ok", base_de_datos: "conectada" });
  } catch (err) {
    res.status(503).json({ estado: "error", base_de_datos: "sin conexion", detalle: err.message });
  }
});

// Crear
app.post("/tareas", async (req, res, next) => {
  try {
    const { titulo, descripcion = "" } = req.body || {};
    if (typeof titulo !== "string" || titulo.trim() === "") {
      return res.status(400).json({ error: "El campo 'titulo' es obligatorio" });
    }
    const { rows } = await pool.query(
      "INSERT INTO tareas (titulo, descripcion) VALUES ($1, $2) RETURNING *",
      [titulo.trim(), descripcion]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// Listar
app.get("/tareas", async (_req, res, next) => {
  try {
    const { rows } = await pool.query("SELECT * FROM tareas ORDER BY id");
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// Obtener una
app.get("/tareas/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "El id debe ser un entero" });
    const { rows } = await pool.query("SELECT * FROM tareas WHERE id = $1", [id]);
    if (rows.length === 0) return res.status(404).json({ error: "Tarea no encontrada" });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// Actualizar
app.put("/tareas/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "El id debe ser un entero" });
    const { titulo, descripcion, completada } = req.body || {};
    if (titulo !== undefined && (typeof titulo !== "string" || titulo.trim() === "")) {
      return res.status(400).json({ error: "El campo 'titulo' no puede estar vacio" });
    }
    const { rows } = await pool.query(
      `UPDATE tareas
          SET titulo = COALESCE($1, titulo),
              descripcion = COALESCE($2, descripcion),
              completada = COALESCE($3, completada)
        WHERE id = $4
        RETURNING *`,
      [titulo === undefined ? null : titulo.trim(), descripcion ?? null, completada ?? null, id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Tarea no encontrada" });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// Eliminar
app.delete("/tareas/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "El id debe ser un entero" });
    const { rowCount } = await pool.query("DELETE FROM tareas WHERE id = $1", [id]);
    if (rowCount === 0) return res.status(404).json({ error: "Tarea no encontrada" });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

app.use((err, _req, res, _next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({ error: "Formato JSON inválido en el cuerpo de la petición", detalle: err.message });
  }
  console.error(err);
  res.status(500).json({ error: "Error interno del servidor" });
});

const puerto = Number(process.env.API_PORT || 3000);
app.listen(puerto, "0.0.0.0", () => {
  console.log(`API escuchando en el puerto ${puerto}`);
});
