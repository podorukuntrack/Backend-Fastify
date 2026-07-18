module.exports = {
  apps: [
    {
      name: 'podorukuntrack-api',
      script: './src/server.js',
      instances: 'max',       // Gunakan seluruh core CPU yang tersedia (2 vCPU)
      exec_mode: 'cluster',   // Aktifkan mode cluster untuk load balancing bawaan PM2
      autorestart: true,
      watch: false,           // Matikan watch di production untuk menghemat CPU/RAM
      max_memory_restart: '800M', // Restart otomatis jika memakan memori terlalu besar (mencegah memory leak)
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        REDIS_PASSWORD: 'podorukuntrack_redis_secret'
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      merge_logs: true        // Menggabungkan log dari semua worker instance menjadi satu
    }
  ]
};
