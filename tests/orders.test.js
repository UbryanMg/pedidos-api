const request = require('supertest');
const { createApp } = require('../src/app');
const { OrderStore } = require('../src/store');
const { canTransition } = require('../src/validation');

const nuevoPedido = (over = {}) => ({
  customer: { name: 'Ana Pérez', email: 'ana@example.com', phone: '3001234567' },
  items: [
    { product: 'Teclado', quantity: 2, price: 50000 },
    { product: 'Mouse', quantity: 1, price: 30000 },
  ],
  shippingAddress: 'Calle 10 # 5-20, Bogotá',
  ...over,
});

describe('API de pedidos', () => {
  let app;
  beforeEach(() => {
    app = createApp(new OrderStore());
  });

  test('GET /health responde ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  test('crea un pedido y calcula el total', async () => {
    const res = await request(app).post('/api/orders').send(nuevoPedido());
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('Pendiente');
    expect(res.body.total).toBe(130000);
    expect(res.body.id).toBeDefined();
  });

  test('rechaza pedidos inválidos', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({ customer: { name: '', email: 'malo' }, items: [], shippingAddress: '' });
    expect(res.status).toBe(400);
    expect(res.body.details.length).toBeGreaterThan(0);
  });

  test('rechaza JSON malformado', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Content-Type', 'application/json')
      .send('{malo');
    expect(res.status).toBe(400);
  });

  test('lista pedidos, filtra por estado y ordena', async () => {
    const a = await request(app).post('/api/orders').send(nuevoPedido());
    await request(app)
      .post('/api/orders')
      .send(nuevoPedido({ customer: { name: 'Luis Gómez', email: 'luis@example.com' } }));
    await request(app).patch(`/api/orders/${a.body.id}/status`).send({ status: 'En Proceso' });

    const todos = await request(app).get('/api/orders');
    expect(todos.body.total).toBe(2);

    const filtrados = await request(app).get('/api/orders?status=En Proceso');
    expect(filtrados.body.total).toBe(1);
    expect(filtrados.body.data[0].id).toBe(a.body.id);

    const porCliente = await request(app).get('/api/orders?customer=luis');
    expect(porCliente.body.total).toBe(1);

    const asc = await request(app).get('/api/orders?sortBy=createdAt&order=asc');
    expect(asc.body.data[0].id).toBe(a.body.id);
  });

  test('valida parámetros de consulta', async () => {
    expect((await request(app).get('/api/orders?status=Raro')).status).toBe(400);
    expect((await request(app).get('/api/orders?sortBy=zzz')).status).toBe(400);
    expect((await request(app).get('/api/orders?order=up')).status).toBe(400);
    expect((await request(app).get('/api/orders?from=no-fecha')).status).toBe(400);
  });

  test('obtiene un pedido por id y da 404 si no existe', async () => {
    const c = await request(app).post('/api/orders').send(nuevoPedido());
    expect((await request(app).get(`/api/orders/${c.body.id}`)).status).toBe(200);
    expect((await request(app).get('/api/orders/no-existe')).status).toBe(404);
  });

  test('avanza el estado en orden y guarda historial', async () => {
    const c = await request(app).post('/api/orders').send(nuevoPedido());
    const id = c.body.id;
    for (const s of ['En Proceso', 'Enviado', 'Entregado']) {
      const r = await request(app).patch(`/api/orders/${id}/status`).send({ status: s });
      expect(r.status).toBe(200);
      expect(r.body.status).toBe(s);
    }
    const final = await request(app).get(`/api/orders/${id}`);
    expect(final.body.history).toHaveLength(4);
  });

  test('no permite retroceder ni estados inválidos', async () => {
    const c = await request(app).post('/api/orders').send(nuevoPedido());
    const id = c.body.id;
    await request(app).patch(`/api/orders/${id}/status`).send({ status: 'Enviado' });
    expect((await request(app).patch(`/api/orders/${id}/status`).send({ status: 'Pendiente' })).status).toBe(409);
    expect((await request(app).patch(`/api/orders/${id}/status`).send({ status: 'Volando' })).status).toBe(400);
    expect((await request(app).patch('/api/orders/nada/status').send({ status: 'Enviado' })).status).toBe(404);
  });

  test('canTransition respeta el flujo', () => {
    expect(canTransition('Pendiente', 'En Proceso')).toBe(true);
    expect(canTransition('Enviado', 'Pendiente')).toBe(false);
    expect(canTransition('Pendiente', 'X')).toBe(false);
  });

  test('ruta desconocida da 404', async () => {
    expect((await request(app).get('/nada')).status).toBe(404);
  });
});
