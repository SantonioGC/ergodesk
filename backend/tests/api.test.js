//pruebas de la API
process.env.JWT_SECRET = process.env.JWT_SECRET || "secreto_de_pruebas";

const request = require("supertest");
const bcrypt = require("bcryptjs");
const app = require("../server");
const db = require("../db");

const SUFIJO = Date.now();
const CLIENTE = { nombre: "Cliente Prueba", email: `cliente_${SUFIJO}@test.com`, password: "Clave12345" };
const ADMIN = { email: `admin_${SUFIJO}@test.com`, password: "clave12345" };
let tokenCliente, tokenAdmin;

beforeAll(async () => {
  const hash = await bcrypt.hash(ADMIN.password, 4);
  await db.query("INSERT INTO usuarios (nombre, email, password, rol) VALUES ('Admin Prueba', ?, ?, 'admin')", [ADMIN.email, hash]);
});

afterAll(async () => {
  await db.query("DELETE FROM usuarios WHERE email IN (?, ?)", [CLIENTE.email, ADMIN.email]);
  await db.end();
});

describe("productos", () => {
  test("GET /api/productos devuelve la lista", async () => {
    const res = await request(app).get("/api/productos");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  test("GET /api/productos/destacados", async () => {
    const res = await request(app).get("/api/productos/destacados");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test("GET /api/productos/categorias", async () => {
    const res = await request(app).get("/api/productos/categorias");
    expect(res.status).toBe(200);
    expect(res.body[0]).toHaveProperty("slug");
  });

  test("GET /api/productos/:id existente", async () => {
    const res = await request(app).get("/api/productos/1");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("nombre");
    expect(res.body).toHaveProperty("precio");
  });

  test("GET /api/productos/:id inexistente da 404", async () => {
    const res = await request(app).get("/api/productos/999999");
    expect(res.status).toBe(404);
  });

  test("GET /api/productos/buscar/:termino", async () => {
    const res = await request(app).get("/api/productos/buscar/escritorio");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe("autenticacion", () => {
  test("registro con campos faltantes da 400", async () => {
    const res = await request(app).post("/api/auth/registro").send({ email: "x@y.com" });
    expect(res.status).toBe(400);
  });

  test("registro con contraseña débil da 400", async () => {
    const res = await request(app).post("/api/auth/registro").send({ ...CLIENTE, email: `debil_${SUFIJO}@test.com`, password: "clave12345" });
    expect(res.status).toBe(400);
  });

  test("registro con nombre con números da 400", async () => {
    const res = await request(app).post("/api/auth/registro").send({ ...CLIENTE, email: `num_${SUFIJO}@test.com`, nombre: "Juan 123" });
    expect(res.status).toBe(400);
  });

  test("registro con correo o nombre demasiado largo da 400", async () => {
    const largo = await request(app).post("/api/auth/registro").send({ ...CLIENTE, email: `${"a".repeat(150)}@test.com` });
    expect(largo.status).toBe(400);
    const nombre = await request(app).post("/api/auth/registro").send({ ...CLIENTE, email: `n_${SUFIJO}@test.com`, nombre: "A".repeat(101) });
    expect(nombre.status).toBe(400);
  });

  test("registro correcto", async () => {
    const res = await request(app).post("/api/auth/registro").send(CLIENTE);
    expect(res.status).toBe(200);
  });

  test("la contraseña se guarda cifrada (bcrypt), no en texto plano", async () => {
    const [[u]] = await db.query("SELECT password FROM usuarios WHERE email = ?", [CLIENTE.email]);
    expect(u.password).not.toBe(CLIENTE.password);
    expect(u.password.startsWith("$2")).toBe(true);
  });

  test("registro duplicado da 400", async () => {
    const res = await request(app).post("/api/auth/registro").send(CLIENTE);
    expect(res.status).toBe(400);
  });

  test("login con credenciales incorrectas da 401", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: CLIENTE.email, password: "incorrecta" });
    expect(res.status).toBe(401);
  });

  test("el login no distingue mayúsculas en el correo", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: CLIENTE.email.toUpperCase(), password: CLIENTE.password });
    expect(res.status).toBe(200);
  });

  test("login correcto devuelve token y rol cliente", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: CLIENTE.email, password: CLIENTE.password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.rol).toBe("cliente");
    tokenCliente = res.body.token;
  });
});

describe("panel admin y roles", () => {
  test("sin token da 401", async () => {
    const res = await request(app).get("/api/admin/metricas");
    expect(res.status).toBe(401);
  });

  test("un cliente no entra al panel (403)", async () => {
    const res = await request(app).get("/api/admin/metricas").set("Authorization", `Bearer ${tokenCliente}`);
    expect(res.status).toBe(403);
  });

  test("un cliente no puede crear productos (403)", async () => {
    const res = await request(app).post("/api/admin/productos").set("Authorization", `Bearer ${tokenCliente}`)
      .send({ nombre: "Hack", categoria_id: 1, precio: 1, stock: 1 });
    expect(res.status).toBe(403);
  });

  test("login de admin devuelve rol admin", async () => {
    const res = await request(app).post("/api/auth/login").send(ADMIN);
    expect(res.status).toBe(200);
    expect(res.body.rol).toBe("admin");
    tokenAdmin = res.body.token;
  });

  test("el admin ve las metricas", async () => {
    const res = await request(app).get("/api/admin/metricas").set("Authorization", `Bearer ${tokenAdmin}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("ventas_totales");
    expect(res.body).toHaveProperty("ticket_promedio");
  });

  test("el admin crea, edita y elimina un producto", async () => {
    const auth = { Authorization: `Bearer ${tokenAdmin}` };
    const crear = await request(app).post("/api/admin/productos").set(auth)
      .send({ nombre: `Producto prueba ${SUFIJO}`, categoria_id: 1, precio: 100, stock: 5 });
    expect(crear.status).toBe(201);
    const id = crear.body.id;

    const editar = await request(app).put(`/api/admin/productos/${id}`).set(auth).send({ precio: 150, stock: 9 });
    expect(editar.status).toBe(200);
    const [[p]] = await db.query("SELECT precio, stock FROM productos WHERE id = ?", [id]);
    expect(Number(p.precio)).toBe(150);
    expect(p.stock).toBe(9);

    const borrar = await request(app).delete(`/api/admin/productos/${id}`).set(auth);
    expect(borrar.status).toBe(200);
  });

  test("el admin no puede poner stock negativo (400)", async () => {
    const res = await request(app).put("/api/admin/productos/1").set("Authorization", `Bearer ${tokenAdmin}`).send({ stock: -3 });
    expect(res.status).toBe(400);
  });

  test("cambiar el envio de un pedido inexistente da 404", async () => {
    const res = await request(app).put("/api/admin/pedidos/999999/envio").set("Authorization", `Bearer ${tokenAdmin}`).send({ estatus: "enviado" });
    expect(res.status).toBe(404);
  });
});

describe("direcciones", () => {
  const DIR = { alias: "Casa", destinatario: "Sergio Gómez", telefono: "667 543 2321", calle: "Abigail", num_ext: "3900", colonia: "Abelardo", ciudad: "Culiacán", estado: "sinaloa", cp: "80000" };
  const auth = () => ({ Authorization: `Bearer ${tokenCliente}` });
  const crear = (cambios) => request(app).post("/api/direcciones").set(auth()).send({ ...DIR, ...cambios });

  test("acepta el teléfono con espacios y lo guarda solo con dígitos", async () => {
    const res = await crear({});
    expect(res.status).toBe(200);
    const lista = await request(app).get("/api/direcciones").set(auth());
    expect(lista.body.direcciones[0].telefono).toBe("6675432321");
  });

  test("guarda el estado con su nombre oficial", async () => {
    const lista = await request(app).get("/api/direcciones").set(auth());
    expect(lista.body.direcciones[0].estado).toBe("Sinaloa");
  });

  test("teléfono con letras o de otro largo da 400", async () => {
    expect((await crear({ telefono: "66754abc21" })).status).toBe(400);
    expect((await crear({ telefono: "66754321" })).status).toBe(400);
  });

  test("código postal con letras o de otro largo da 400", async () => {
    expect((await crear({ cp: "8000A" })).status).toBe(400);
    expect((await crear({ cp: "800" })).status).toBe(400);
  });

  test("campos más largos que la base dan 400 (no 500)", async () => {
    expect((await crear({ alias: "a".repeat(51) })).status).toBe(400);
    expect((await crear({ num_ext: "1".repeat(11) })).status).toBe(400);
    expect((await crear({ referencias: "r".repeat(256) })).status).toBe(400);
  });

  test("nombre o ciudad con números y estado inventado dan 400", async () => {
    expect((await crear({ destinatario: "Sergio 99" })).status).toBe(400);
    expect((await crear({ ciudad: "Culiacán 2" })).status).toBe(400);
    expect((await crear({ estado: "Narnia" })).status).toBe(400);
  });
});

describe("carrito y admin: límites", () => {
  test("cantidad mayor a 99 da 400", async () => {
    const res = await request(app).post("/api/carrito/items").set("Authorization", `Bearer ${tokenCliente}`).send({ producto_id: 1, cantidad: 100 });
    expect(res.status).toBe(400);
  });

  test("el admin no puede usar una URL de imagen inválida (400)", async () => {
    const res = await request(app).put("/api/admin/productos/1").set("Authorization", `Bearer ${tokenAdmin}`).send({ imagen: "javascript:alert(1)" });
    expect(res.status).toBe(400);
  });
});
