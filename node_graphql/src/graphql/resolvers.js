const db = require('../config/database');

const resolvers = {
  Query: {
    getAthleteMetrics: async (_, { athlete_id, limit = 100 }) => {
      // Izvršavamo SELECT * ali će Apollo Server automatski odbaciti 
      // sve kolone koje klijent NIJE eksplicitno tražio u svom GraphQL upitu
      const queryText = `
        SELECT * FROM athlete_metrics 
        WHERE athlete_id = $1 
        ORDER BY recorded_at DESC 
        LIMIT $2;
      `;
      try {
        const res = await db.query(queryText, [athlete_id, limit]);
        return res.rows.map(row => ({
          ...row,
          recorded_at: new Date(row.recorded_at).toISOString()
        }));
      } catch (err) {
        console.error("GraphQL Query Error:", err);
        throw new Error("Greška prilikom pretrage podataka.");
      }
    },
  },
  Mutation: {
    createMetric: async (_, args) => {
      const queryText = `
        INSERT INTO athlete_metrics 
        (athlete_id, recorded_at, heart_rate, speed, acc_x, acc_y, acc_z, gyro_x, gyro_y, gyro_z)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *;
      `;
      const values = [
        args.athlete_id, args.recorded_at, args.heart_rate, args.speed,
        args.acc_x, args.acc_y, args.acc_z, args.gyro_x, args.gyro_y, args.gyro_z
      ];
      try {
        const res = await db.query(queryText, values);
        return {
          ...res.rows[0],
          recorded_at: new Date(res.rows[0].recorded_at).toISOString()
        };
      } catch (err) {
        console.error("GraphQL Mutation Error:", err);
        throw new Error("Greška prilikom upisa podatka.");
      }
    }
  }
};

module.exports = resolvers;