const { randomUUID } = require('crypto');

/**
 * Repositorio en memoria. Se encapsula en una clase para poder cambiarlo
 * por DynamoDB / RDS más adelante sin tocar las rutas.
 */
class OrderStore {
  constructor() {
    this.orders = new Map();
  }

  create(data) {
    const now = new Date().toISOString();
    const order = {
      id: randomUUID(),
      customer: data.customer,
      items: data.items,
      shippingAddress: data.shippingAddress,
      total: data.items.reduce((acc, i) => acc + i.quantity * (i.price || 0), 0),
      status: 'Pendiente',
      createdAt: now,
      updatedAt: now,
      history: [{ status: 'Pendiente', at: now }],
    };
    this.orders.set(order.id, order);
    return order;
  }

  get(id) {
    return this.orders.get(id) || null;
  }

  all() {
    return Array.from(this.orders.values());
  }

  update(id, patch) {
    const current = this.orders.get(id);
    if (!current) return null;
    const updated = { ...current, ...patch, updatedAt: new Date().toISOString() };
    this.orders.set(id, updated);
    return updated;
  }

  clear() {
    this.orders.clear();
  }
}

module.exports = { OrderStore };
