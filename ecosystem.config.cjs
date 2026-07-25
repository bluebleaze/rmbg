module.exports = {
  apps: [{
    name: 'rmbg',
    script: 'server.js',
    env: { PORT: 3456 },
    max_memory_restart: '150M',
    autorestart: true
  }]
}
