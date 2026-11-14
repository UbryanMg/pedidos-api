const { createApp } = require('./app');

const port = process.env.PORT || 8080;
createApp().listen(port, () => {
  console.log(`API de pedidos escuchando en el puerto ${port}`);
});
