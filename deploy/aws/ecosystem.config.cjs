module.exports = {
  apps: [
    {
      name: 'rct-register-web',
      cwd: '/opt/rct-register-web',
      script: 'npm',
      args: 'run start -- -p 3000',
      env: {
        NODE_ENV: 'production'
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: '512M'
    }
  ]
};
