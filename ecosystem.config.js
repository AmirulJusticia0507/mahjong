module.exports = {
  apps: [{
    name: 'mahjong',
    script: 'src/server.js',
    instances: 1,
    autorestart: true,
    max_memory_restart: '300M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
  }],
};
