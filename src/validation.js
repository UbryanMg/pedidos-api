const STATUSES = ['Pendiente', 'En Proceso', 'Enviado', 'Entregado'];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

/** Valida el cuerpo de POST /orders. Devuelve un arreglo de errores (vacío si todo está bien). */
function validateNewOrder(body) {
  const errors = [];
  if (!body || typeof body !== 'object') return ['El cuerpo de la petición es obligatorio'];

  const { customer, items, shippingAddress } = body;

  if (!customer || typeof customer !== 'object') {
    errors.push('customer es obligatorio');
  } else {
    if (!isNonEmptyString(customer.name)) errors.push('customer.name es obligatorio');
    if (!isNonEmptyString(customer.email) || !EMAIL_RE.test(customer.email)) {
      errors.push('customer.email es obligatorio y debe ser un correo válido');
    }
    if (customer.phone !== undefined && !isNonEmptyString(String(customer.phone))) {
      errors.push('customer.phone no puede estar vacío si se envía');
    }
  }

  if (!Array.isArray(items) || items.length === 0) {
    errors.push('items debe ser un arreglo con al menos un producto');
  } else {
    items.forEach((item, idx) => {
      if (!item || typeof item !== 'object') {
        errors.push(`items[${idx}] inválido`);
        return;
      }
      if (!isNonEmptyString(item.product)) errors.push(`items[${idx}].product es obligatorio`);
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        errors.push(`items[${idx}].quantity debe ser un entero mayor que 0`);
      }
      if (item.price !== undefined && (typeof item.price !== 'number' || item.price < 0)) {
        errors.push(`items[${idx}].price debe ser un número mayor o igual a 0`);
      }
    });
  }

  if (!isNonEmptyString(shippingAddress)) {
    errors.push('shippingAddress es obligatorio');
  }

  return errors;
}

/** El estado solo puede avanzar hacia adelante en el flujo. */
function canTransition(from, to) {
  const a = STATUSES.indexOf(from);
  const b = STATUSES.indexOf(to);
  return a !== -1 && b !== -1 && b > a;
}

module.exports = { STATUSES, validateNewOrder, canTransition };
