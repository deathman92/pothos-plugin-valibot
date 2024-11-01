import type { MaybePromise, SchemaTypes } from "@pothos/core";
import type { GraphQLResolveInfo } from "graphql";
import type {
  BaseIssue,
  BaseSchema,
  BaseSchemaAsync,
  ErrorMessage,
  ValiError,
} from "valibot";

export interface ValidationPluginOptions<Types extends SchemaTypes> {
  validationError?: ValidationErrorFn<Types>;
}

export type ValiSchema<T> =
  | BaseSchema<T, T, BaseIssue<any>>
  | BaseSchemaAsync<T, T, BaseIssue<any>>;

export type Constraint<T> =
  | T
  | [value: T, message?: ErrorMessage<BaseIssue<unknown>>];

export type RefineContraint<T = unknown> = (
  schema: ValiSchema<T>
) =>
  | BaseSchema<T, any, BaseIssue<any>>
  | BaseSchemaAsync<T, any, BaseIssue<any>>;

export type CheckConstraints<T = unknown> =
  | Constraint<(value: T) => MaybePromise<boolean>>
  | Constraint<(value: T) => MaybePromise<boolean>>[];

export type ValidationErrorFn<Types extends SchemaTypes> = (
  error: ValiError<ValiSchema<unknown>>,
  args: Record<string, unknown>,
  context: Types["Context"],
  info: GraphQLResolveInfo
) => Error | string;

export interface BaseValidationOptions<T = unknown> {
  schema?: ValiSchema<T>;
  refine?: RefineContraint<T>;
  check?: CheckConstraints<T>;
  type?: string;
}
export interface NumberValidationOptions<T extends number = number>
  extends BaseValidationOptions<T> {
  type?: "number";
  minValue?: Constraint<number>;
  maxValue?: Constraint<number>;
  integer?: Constraint<boolean>;
}

export interface BigIntValidationOptions<T extends bigint = bigint>
  extends BaseValidationOptions<T> {
  type?: "bigint";
  minValue?: Constraint<number>;
  maxValue?: Constraint<number>;
}

export interface BooleanValidationOptions<T extends boolean = boolean>
  extends BaseValidationOptions<T> {
  type?: "boolean";
}

export interface DateValidationOptions<T extends Date = Date>
  extends BaseValidationOptions<T> {
  type?: "date";
  minValue?: Constraint<Date>;
  maxValue?: Constraint<Date>;
}

export interface FileValidationOptions<T extends File = File>
  extends BaseValidationOptions<T> {
  type?: "file";
  minSize?: Constraint<number>;
  maxSize?: Constraint<number>;
  mimeType?: Constraint<readonly `${string}/${string}`[]>;
}

export interface StringValidationOptions<T extends string = string>
  extends BaseValidationOptions<T> {
  type?: "string";
  trim?: boolean;
  minLength?: Constraint<number>;
  maxLength?: Constraint<number>;
  length?: Constraint<number>;
  nonEmpty?: Constraint<boolean>;
  url?: Constraint<boolean>;
  uuid?: Constraint<boolean>;
  email?: Constraint<boolean>;
  regex?: Constraint<RegExp>;
}

type ObjectFields<T extends object> = {
  [Name in keyof T]-?: T[Name] extends Function ? never : Name;
}[keyof T];

export interface ObjectValidationOptions<T extends object = object>
  extends BaseValidationOptions<T> {
  type?: "object";
  fields?: {
    [Name in ObjectFields<T>]?: ValidationOptions<NonNullable<T[Name]>>;
  };
}

export interface ArrayValidationOptions<T extends unknown[] = unknown[]>
  extends BaseValidationOptions<T> {
  type?: "array";
  items?: ValidationOptions<T[number]>;
  minLength?: Constraint<number>;
  maxLength?: Constraint<number>;
  length?: Constraint<number>;
  nonEmpty?: Constraint<boolean>;
}

export type ValidationOptions<T> = [T] extends [number]
  ? NumberValidationOptions<T>
  : [T] extends [bigint]
  ? BigIntValidationOptions<T>
  : [T] extends [boolean]
  ? BooleanValidationOptions<T>
  : [T] extends [string]
  ? StringValidationOptions<T>
  : [T] extends [Date]
  ? DateValidationOptions<T>
  : [T] extends [File]
  ? FileValidationOptions<T>
  : [T] extends [unknown[]]
  ? ArrayValidationOptions<T>
  : [T] extends [object]
  ? ObjectValidationOptions<T>
  : [T] extends [any]
  ? BaseValidationOptions<T>
  : never;

export type ValidationOptionUnion =
  | ArrayValidationOptions
  | BaseValidationOptions
  | BigIntValidationOptions
  | BooleanValidationOptions
  | DateValidationOptions
  | FileValidationOptions
  | NumberValidationOptions
  | ObjectValidationOptions
  | StringValidationOptions;
