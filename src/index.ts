import './global-types'
import SchemaBuilder, {
  BasePlugin,
  mapInputFields,
  type PothosInputFieldConfig,
  type PothosInputFieldType,
  type PothosOutputFieldConfig,
  PothosSchemaError,
  PothosValidationError,
  resolveInputTypeConfig,
  type SchemaTypes,
} from '@pothos/core'
import type { GraphQLFieldResolver, GraphQLResolveInfo } from 'graphql'
import * as v from 'valibot'
import createValibotSchema, {
  combine,
  createArrayValidator,
  isArrayValidator,
  refine,
} from './createValibotSchema'
import type {
  ValiSchema,
  ValidationOptionUnion,
  ValidationOptions,
} from './types'

export * from './types'

const pluginName = 'valibot'

export class PothosValibotPlugin<
  Types extends SchemaTypes,
> extends BasePlugin<Types> {
  inputFieldValidators = new Map<string, v.ObjectEntriesAsync>()

  override onInputFieldConfig(
    fieldConfig: PothosInputFieldConfig<Types>,
  ): PothosInputFieldConfig<Types> {
    const fieldType = resolveInputTypeConfig(fieldConfig.type, this.buildCache)
    const validationOptions = fieldConfig.pothosOptions.validate as
      | ValidationOptionUnion
      | undefined

    if (!validationOptions && fieldType.kind !== 'InputObject') {
      return fieldConfig
    }

    const fieldName =
      fieldConfig.kind === 'Arg'
        ? `${fieldConfig.parentType}.${fieldConfig.parentField}(${fieldConfig.name})`
        : `${fieldConfig.parentType}.${fieldConfig.name}`

    const validator = this.createValidator(
      validationOptions,
      fieldConfig.type,
      fieldName,
    )

    if (fieldConfig.kind === 'Arg') {
      return {
        ...fieldConfig,
        extensions: {
          ...fieldConfig.extensions,
          validator,
        },
      }
    }

    this.inputFieldValidators.set(fieldConfig.parentType, {
      ...this.inputFieldValidators.get(fieldConfig.parentType),
      [fieldConfig.name]: validator,
    })

    return fieldConfig
  }

  override wrapResolve(
    resolver: GraphQLFieldResolver<unknown, Types['Context'], object>,
    fieldConfig: PothosOutputFieldConfig<Types>,
  ): GraphQLFieldResolver<unknown, Types['Context'], object> {
    // Only used to check if validation is required
    const argMap = mapInputFields(
      fieldConfig.args,
      this.buildCache,
      (field) => field.extensions?.validator ?? null,
    )

    if (!argMap && !fieldConfig.pothosOptions.validate) {
      return resolver
    }

    const args: v.ObjectEntriesAsync = {}

    for (const [argName, arg] of Object.entries(fieldConfig.args)) {
      const validator = arg.extensions?.validator as
        | ValiSchema<unknown>
        | undefined

      if (validator) {
        args[argName] = validator
      }
    }

    let validator: ValiSchema<unknown> = v.looseObjectAsync(args)

    if (fieldConfig.pothosOptions.validate) {
      validator = refine(
        validator,
        fieldConfig.pothosOptions.validate as ValidationOptionUnion,
      )
    }

    const validationError = this.builder.options.valibot?.validationError

    const validatorWithErrorHandling =
      validationError &&
      async function validate(
        value: unknown,
        ctx: object,
        info: GraphQLResolveInfo,
      ) {
        try {
          const result: unknown = await v.parseAsync(validator, value)

          return result
        } catch (error: unknown) {
          const errorOrMessage = validationError(
            error as v.ValiError<any>,
            value as Record<string, unknown>,
            ctx,
            info,
          )

          if (typeof errorOrMessage === 'string') {
            throw new PothosValidationError(errorOrMessage)
          }

          throw errorOrMessage
        }
      }

    return async (parent, rawArgs, context, info) =>
      resolver(
        parent,
        (await (validatorWithErrorHandling
          ? validatorWithErrorHandling(rawArgs, context, info)
          : v.parseAsync(validator, rawArgs))) as object,
        context,
        info,
      )
  }

  createValidator(
    options: ValidationOptionUnion | undefined,
    type: PothosInputFieldType<Types> | null,
    fieldName: string,
  ): ValiSchema<unknown> {
    if (type?.kind === 'InputObject') {
      const typeConfig = this.buildCache.getTypeConfig(type.ref, 'InputObject')

      let fieldValidator = refine(
        v.lazyAsync(() =>
          v.looseObjectAsync(
            this.inputFieldValidators.get(typeConfig.name) ?? {},
          ),
        ),
        options,
      )

      if (typeConfig.pothosOptions.validate) {
        fieldValidator = refine(
          fieldValidator,
          typeConfig.pothosOptions.validate as ValidationOptions<unknown>,
        )
      }

      return combine([fieldValidator], type.required)
    }

    if (type?.kind === 'List') {
      if (options && !isArrayValidator(options)) {
        throw new PothosSchemaError(
          `Expected valid array validator for ${fieldName}`,
        )
      }

      const items = this.createValidator(options?.items, type.type, fieldName)

      if (options) {
        return combine([createArrayValidator(options, items)], type.required)
      }

      return combine([v.arrayAsync(items)], type.required)
    }

    if (!options) {
      return v.unknown()
    }

    return createValibotSchema(options, !type || type.required)
  }
}

SchemaBuilder.registerPlugin(pluginName, PothosValibotPlugin, {
  v3(options) {
    return {
      validationOptions: undefined,
      valibot: options.validationOptions,
    }
  },
})

export default pluginName

export { default as createValibotSchema } from './createValibotSchema.js'
