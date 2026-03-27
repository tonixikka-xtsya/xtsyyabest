const express = require('express');

const server = express();

server.get('/', (_req, res) => {
  res.send('OK');
});

function keepAlive() {
  server.listen(3000, () => {
    console.log('Keep-alive server running on port 3000');
  });
}

module.exports = keepAlive;
