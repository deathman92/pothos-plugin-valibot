import type { BuildConfig } from 'bun'
import dts from 'bun-plugin-dts'

const defaultBuildConfig: BuildConfig = {
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  packages: 'external',
  splitting: true,
  sourcemap: 'external',
}

await Promise.all([
  Bun.build({
    ...defaultBuildConfig,
    plugins: [dts()],
    target: 'node',
    format: 'esm',
    naming: '[dir]/[name].js',
  }),
  Bun.build({
    ...defaultBuildConfig,
    target: 'node',
    format: 'cjs',
    naming: '[dir]/[name].cjs',
  }),
])
