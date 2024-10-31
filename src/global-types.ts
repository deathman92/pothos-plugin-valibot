import type {
  FieldNullability,
  FieldRequiredness,
  InputFieldMap,
  InputShapeFromFields,
  InputShapeFromTypeParam,
  InputType,
  SchemaTypes,
  TypeParam,
} from '@pothos/core'
import type { ValidationOptions, ValidationPluginOptions } from './types.js'

import type { PothosValibotPlugin } from './index.js'

declare global {
  export namespace PothosSchemaTypes {
    export interface Plugins<Types extends SchemaTypes> {
      valibot: PothosValibotPlugin<Types>
    }

    export interface SchemaBuilderOptions<Types extends SchemaTypes> {
      valibot?: ValidationPluginOptions<Types>
    }

    export interface V3SchemaBuilderOptions<Types extends SchemaTypes> {
      valibot?: never
      validationOptions?: ValidationPluginOptions<Types>
    }

    export interface FieldOptions<
      Types extends SchemaTypes,
      ParentShape,
      Type extends TypeParam<Types>,
      Nullable extends FieldNullability<Type>,
      Args extends InputFieldMap,
      ResolveShape,
      ResolveReturnShape,
    > {
      validate?: ValidationOptions<InputShapeFromFields<Args>>
    }

    export interface InputObjectTypeOptions<
      Types extends SchemaTypes = SchemaTypes,
      Fields extends InputFieldMap = InputFieldMap,
    > {
      validate?: ValidationOptions<InputShapeFromFields<Fields>>
    }

    export interface InputFieldOptions<
      Types extends SchemaTypes = SchemaTypes,
      Type extends InputType<Types> | [InputType<Types>] =
        | InputType<Types>
        | [InputType<Types>],
      Req extends FieldRequiredness<Type> = FieldRequiredness<Type>,
    > {
      validate?: ValidationOptions<InputShapeFromTypeParam<Types, Type, true>>
    }
  }
}
