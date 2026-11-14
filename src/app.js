const express = require('express');
const cors = require('cors');
const { OrderStore } = require('./store');
const ordersRouter = require('./routes/orders');
const { STATUSES } = require('./validation');

function createApp(store = new OrderStore()) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/', (req, res) => {
    res.json({
      servicio: 'API de Gestión de Pedidos',
      version: process.env.APP_VERSION || '1.0.0',
      entorno: process.env.APP_ENV || 'local',
      estados: STATUSES,
      endpoints: [
        'GET    /health',
        'POST   /api/orders',
        'GET    /api/orders?status=&customer=&from=&to=&sortBy=&order=&page=&limit=',
        'GET    /api/orders/:id',
        'PATCH  /api/orders/:id/status',
      ],
    });
  });

  app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

  app.use('/api/orders', ordersRouter(store));

  app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON inválido' });
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  });

  return app;
}

module.exports = { createApp };
