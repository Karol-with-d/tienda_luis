import express, { Request, Response } from "express";
import { readJSON, writeJSON } from "./db";
import * as os from "os";

const app = express();
app.use(express.json());

// Interfaz para el inventario de Tienda Luis
interface Producto {
  id: number;
  nombre: string;
  categoria: string;
  precio: number;
  stock: number;
  fechaActualizacion: string;
}

const FILE = "productos.json";

// ---------- Endpoints de Información Generales ----------
app.get("/saludo", (req: Request, res: Response) => {
  const cliente = (req.query.nombre as string) || "Estimado Cliente";
  res.json({ mensaje: `¡Bienvenido a Tienda Luis, ${cliente}!` });
});

app.get("/info", (_req: Request, res: Response) => {
  res.json({
    servicio: "tiendaLuis.local - API de Inventario",
    version: "1.0.0",
    so: process.platform,
    node: process.version,
    fecha: new Date().toISOString()
  });
});

app.get("/cotizacion", (_req: Request, res: Response) => {
  res.json({ moneda: "USD", compra: 8.75, venta: 8.85, fecha: new Date().toISOString() });
});

//CRUD de Productos / Inventario

// GET productos - Obtener todo el inventario
app.get("/productos", (_req: Request, res: Response) => {
  const productos = readJSON<Producto[]>(FILE);
  res.json(productos);
});

// GET /productos/:id - Obtener un producto por ID
app.get("/productos/:id", (req: Request, res: Response) => {
  const productos = readJSON<Producto[]>(FILE);
  const producto = productos.find((p) => p.id === Number(req.params.id));
  if (!producto) {
    return res.status(404).json({ error: "Producto no encontrado en inventario" });
  }
  res.json(producto);
});

// POST productos - Agregar nuevo producto al inventario
app.post("/productos", (req: Request, res: Response) => {
  const productos = readJSON<Producto[]>(FILE);
  
  if (!req.body.nombre || req.body.precio === undefined) {
    return res.status(400).json({ error: "El nombre y el precio son obligatorios" });
  }

  const nuevoProducto: Producto = {
    id: productos.length ? Math.max(...productos.map((p) => p.id)) + 1 : 1,
    nombre: req.body.nombre,
    categoria: req.body.categoria || "Abarrotes",
    precio: Number(req.body.precio),
    stock: Number(req.body.stock) || 0,
    fechaActualizacion: new Date().toISOString()
  };

  productos.push(nuevoProducto);
  writeJSON(FILE, productos);
  res.status(201).json(nuevoProducto);
});

// PUT /productos/:id - Actualizar datos de un producto
app.put("/productos/:id", (req: Request, res: Response) => {
  const productos = readJSON<Producto[]>(FILE);
  const index = productos.findIndex((p) => p.id === Number(req.params.id));

  if (index === -1) {
    return res.status(404).json({ error: "Producto no encontrado en inventario" });
  }

  productos[index] = {
    ...productos[index],
    ...req.body,
    id: productos[index].id,
    fechaActualizacion: new Date().toISOString()
  };

  writeJSON(FILE, productos);
  res.json(productos[index]);
});

// DELETE /productos/:id - Eliminar un producto
app.delete("/productos/:id", (req: Request, res: Response) => {
  const productos = readJSON<Producto[]>(FILE);
  const filtrados = productos.filter((p) => p.id !== Number(req.params.id));

  if (filtrados.length === productos.length) {
    return res.status(404).json({ error: "Producto no encontrado" });
  }

  writeJSON(FILE, filtrados);
  res.status(204).send();
});

// ---------- Health Check con simulación de falla ----------
app.get("/health", (req: Request, res: Response) => {
  if (req.query.simular === "falla") {
    return res.status(503).json({
      estado: "No Health",
      nodo: os.hostname(),
      timeStamp: new Date().toISOString(),
      mensaje: "Falla simulada en servidor Tienda Luis"
    });
  }

  res.status(200).json({
    estado: "Health",
    nodo: os.hostname(),
    timeStamp: new Date().toISOString()
  });
});

// ---------- Inicialización del Servidor ----------
const PORT = Number(process.env.PORT) || 7000;
app.listen(PORT, () => {
  console.log(`tiendaLuis.local ejecutándose en http://localhost:${PORT}`);
});