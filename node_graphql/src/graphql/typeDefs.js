const { gq_tpl } = require('graphql');

// Koristimo string literal za definiciju GraphQL tipova i upita
const typeDefs = `#graphql
  type AthleteMetric {
    id: ID!
    athlete_id: String!
    recorded_at: String!
    heart_rate: Float
    speed: Float
    acc_x: Float
    acc_y: Float
    acc_z: Float
    gyro_x: Float
    gyro_y: Float
    gyro_z: Float
  }

  type Query {
    # Scenario B: Selektivno praćenje određenog sportiste uz limit
    getAthleteMetrics(athlete_id: String!, limit: Int): [AthleteMetric]
  }

  type Mutation {
    # Omogućavamo i upis podataka kroz GraphQL radi kompletnosti
    createMetric(
      athlete_id: String!
      recorded_at: String!
      heart_rate: Float
      speed: Float
      acc_x: Float
      acc_y: Float
      acc_z: Float
      gyro_x: Float
      gyro_y: Float
      gyro_z: Float
    ): AthleteMetric
  }
`;

module.exports = typeDefs;