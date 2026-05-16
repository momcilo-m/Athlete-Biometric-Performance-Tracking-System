module.exports = {
  port: process.env.GRPC_PORT || "50051",
  db: {
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || "athlete_performance",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "password",
  }
};