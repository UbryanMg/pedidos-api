const express = require('express');
const { STATUSES, validateNewOrder, canTransition } = require('../validation');

const SORTABLE = ['createdAt', 'updatedAt', 'status', 'total'];

module.exports = function ordersRouter(store) {
  const router = express.Router();

  // POST /api/orders  -> crear pedido
  router.post('/', (req, res) => {
    const errors = validateNewOrder(req.body);
    if (errors.length) return res.status(400).json({ error: 'Validación fallida', details: errors });

    const { customer, items, shippingAddress } = req.body;
    const order = store.create({
      customer: {
        name: customer.name.trim(),
        email: customer.email.trim(),
        phone: customer.phone,
      },
      items: items.map((i) => ({ product: i.product.trim(), quantity: i.quantity, price: i.price || 0 })),
      shippingAddress: shippingAddress.trim(),
    });
    res.status(201).location(`/api/orders/${order.id}`).json(order);
  });

  // GET /api/orders  -> listar con filtros, orden y paginación
  router.get('/', (req, res) => {
    const { status, customer, from, to, sortBy = 'createdAt', order = 'desc' } = req.query;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);

    if (status && !STATUSES.includes(status)) {
      return res.status(400).json({ error: `status inválido. Valores: ${STATUSES.join(', ')}` });
    }
    if (!SORTABLE.includes(sortBy)) {
      return res.status(400).json({ error: `sortBy inválido. Valores: ${SORTABLE.join(', ')}` });
    }
    if (!['asc', 'desc'].includes(order)) {
      return res.status(400).json({ error: 'order debe ser asc o desc' });
    }
    if ((from && Number.isNaN(Date.parse(from))) || (to && Number.isNaN(Date.parse(to)))) {
      return res.status(400).json({ error: 'from/to deben ser fechas ISO válidas' });
    }

    let list = store.all();
    if (status) list = list.filter((o) => o.status === status);
    if (customer) {
      const q = customer.toLowerCase();
      list = list.filter(
        (o) => o.customer.name.toLowerCase().includes(q) || o.customer.email.toLowerCase().includes(q)
      );
    }
    if (from) list = list.filter((o) => new Date(o.createdAt) >= new Date(from));
    if (to) list = list.filter((o) => new Date(o.createdAt) <= new Date(to));

    const dir = order === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      if (sortBy === 'status') return (STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status)) * dir;
      if (sortBy === 'total') return (a.total - b.total) * dir;
      return (new Date(a[sortBy]) - new Date(b[sortBy])) * dir;
    });

    const total = list.length;
    const data = list.slice((page - 1) * limit, page * limit);
    res.json({ data, page, limit, total, pages: Math.ceil(total / limit) });
  });

  // GET /api/orders/:id  -> detalle
  router.get('/:id', (req, res) => {
    const order = store.get(req.params.id);
    if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });
    res.json(order);
  });

  // PATCH /api/orders/:id/status  -> actualizar estado
  router.patch('/:id/status', (req, res) => {
    const order = store.get(req.params.id);
    if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });

    const { status } = req.body || {};
    if (!STATUSES.includes(status)) {
      return res.status(400).json({ error: `status inválido. Valores: ${STATUSES.join(', ')}` });
    }
    if (!canTransition(order.status, status)) {
      return res.status(409).json({
        error: `Transición no permitida: ${order.status} -> ${status}`,
        flujo: STATUSES,
      });
    }

    const now = new Date().toISOString();
    const updated = store.update(order.id, {
      status,
      history: [...order.history, { status, at: now }],
    });
    res.json(updated);
  });

  return router;
};
