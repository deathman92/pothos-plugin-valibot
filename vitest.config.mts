import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    deps: { fallbackCJS: true },
    exclude: ['**/node_modules/**'],
    typecheck: {
      enabled: true,
      tsconfig: 'tsconfig.type.json',
    },
  },
})
