const config = {
  apps: [
    {
      name: "2020rm-frontend",
      script: "npm",
      args: "start",
      env: {
        NODE_ENV: "production",
        PORT: "3000"
      }
    }
  ]
};

module.exports = config;
