module.exports = {
  apps: [
    {
      name: "fanwatch-api",
      script: "npm",
      args: "start",
      cwd: "./api",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: "256M",
      // Log settings
      error_file: "/var/log/fanwatch/api-error.log",
      out_file: "/var/log/fanwatch/api-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 10000,
    },
  ],
};
