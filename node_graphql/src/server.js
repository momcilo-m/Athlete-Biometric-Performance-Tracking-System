const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const typeDefs = require('./graphql/typeDefs');
const resolvers = require('./graphql/resolvers');

async function startServer() {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });

  const port = parseInt(process.env.GRAPHQL_PORT || '4000', 10);

  const { url } = await startStandaloneServer(server, {
    listen: { host: '0.0.0.0', port: port },
  });

  console.log(`🚀 GraphQL mikroservis spreman na adresi: ${url}`);
}

startServer();