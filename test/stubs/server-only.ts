// Test-only stub for the "server-only" package. The real package throws
// when imported outside a Next.js server bundle context, which includes
// plain vitest/node execution — aliased here so integration tests can
// import *.server.ts modules directly. See vitest.integration.config.ts.
export {};
