# API de Gestión de Pedidos

API RESTful (Node.js + Express) desplegada de forma automática en AWS con
CodePipeline → CodeBuild → Elastic Beanstalk (entorno de pruebas y producción).

## Endpoints

| Método | Ruta | Descripción |
|-------|------|-------------|
| GET | `/health` | Estado del servicio |
| POST | `/api/orders` | Crear pedido |
| GET | `/api/orders` | Listar (filtros: `status`, `customer`, `from`, `to`; orden: `sortBy`, `order`; paginación: `page`, `limit`) |
| GET | `/api/orders/:id` | Detalle de un pedido |
| PATCH | `/api/orders/:id/status` | Cambiar estado (Pendiente → En Proceso → Enviado → Entregado) |

### Ejemplo

```bash
curl -X POST http://localhost:8080/api/orders -H "Content-Type: application/json" -d '{
  "customer": {"name": "Ana Pérez", "email": "ana@example.com"},
  "items": [{"product": "Teclado", "quantity": 2, "price": 50000}],
  "shippingAddress": "Calle 10 # 5-20, Bogotá"
}'

curl -X PATCH http://localhost:8080/api/orders/<id>/status -H "Content-Type: application/json" -d '{"status":"En Proceso"}'
```

## Desarrollo

```bash
npm install
npm test
npm start
```

## Flujo CI/CD

`git push` → CodePipeline (Source/GitHub) → CodeBuild (`buildspec.yml`: `npm ci` + pruebas + artefacto)
→ Deploy a Elastic Beanstalk **test** → aprobación manual → Deploy a Elastic Beanstalk **producción**.
Los logs y métricas se revisan en CloudWatch.
