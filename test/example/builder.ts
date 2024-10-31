import '../../src'
import SchemaBuilder from '@pothos/core'
import * as v from 'valibot'

export default new SchemaBuilder<{
  Scalars: {
    ID: { Input: bigint | number | string; Output: bigint | number | string }
  }
}>({
  plugins: ['valibot'],
  valibot: {
    validationError: (error) =>
      error.issues
        .map((issue) => `${v.getDotPath(issue)}: ${issue.message}`)
        .join(', '),
  },
})
