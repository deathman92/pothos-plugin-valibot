# Valibot Validation Plugin

<div align="center">

[![@foadonis/magnify](https://img.shields.io/npm/v/pothos-plugin-valibot?style=for-the-badge)](https://www.npmjs.com/package/pothos-plugin-valibot) [![License](https://img.shields.io/github/license/deathman92/pothos-plugin-valibot?label=License&style=for-the-badge)](LICENCE) ![](https://img.shields.io/badge/Typescript-294E80.svg?style=for-the-badge&logo=typescript)

</div>

A plugin for adding validation for field arguments based on
[Valibot](https://valibot.dev/). This plugin does not expose valibot directly, but most of the
options map closely to the validations available in valibot.

## Usage

### Install

To use the valibot plugin you will need to install both `valibot` package and the valibot plugin:

```package-install
pnpm add valibot pothos-plugin-valibot
```

### Setup

```typescript
import ValibotPlugin from "pothos-plugin-valibot";
const builder = new SchemaBuilder({
  plugins: [ValibotPlugin],
  valibot: {
    // optionally customize how errors are formatted
    validationError: (valiError, args, context, info) => {
      // the default behavior is to just throw the valibot error directly
      return valiError;
    },
  },
});

builder.queryType({
  fields: (t) => ({
    simple: t.boolean({
      args: {
        // Validate individual args
        email: t.arg.string({
          validate: {
            email: true,
          },
        }),
        phone: t.arg.string(),
      },
      // Validate all args together
      validate: {
        check: (args) => !!args.phone || !!args.email,
      }
      resolve: () => true,
    }),
  }),
});
```

## Options

`validationError`: (optional) A function that will be called when validation fails. The function
will be passed the the valibot validation error, as well as the args, context and info objects. It can
throw an error, or return an error message or custom Error instance.

### Examples

#### With custom message

```typescript
builder.queryType({
  fields: (t) => ({
    withMessage: t.boolean({
      args: {
        email: t.arg.string({
          validate: {
            email: [true, "invalid email address"],
          },
        }),
        phone: t.arg.string(),
      },
      validate: {
        check: [
          (args) => !!args.phone || !!args.email,
          "Must provide either phone number or email address",
        ],
      },
      resolve: () => true,
    }),
  }),
});
```

### Validating List

```typescript
builder.queryType({
  fields: (t) => ({
    list: t.boolean({
      args: {
        list: t.arg.stringList({
          validate: {
            items: {
              email: true,
            },
            maxLength: 3,
          },
        }),
      },
      resolve: () => true,
    }),
  }),
});
```

### Using your own valibot schemas

If you just want to use a valibot schema defined somewhere else, rather than using the validation
options you can use the `schema` option:

```typescript
builder.queryType({
  fields: (t) => ({
    list: t.boolean({
      args: {
        max5: t.arg.int({
          validate: {
            schema: v.pipeAsync(v.number(), v.integer(), v.maxValue(5)),
          },
        }),
      },
      resolve: () => true,
    }),
  }),
});
```

You can also validate all arguments together using a valibot schema:

```typescript
builder.queryType({
  fields: (t) => ({
    simple: t.boolean({
      args: {
        email: t.arg.string(),
        phone: t.arg.string(),
      },
      // Validate all args together using own zod schema
      validate: {
        schema: v.object({
          email: v.pipeAsync(v.string(), v.email()),
          phone: v.string(),
        }),
      },
      resolve: () => true,
    }),
  }),
});
```

## API

### On Object fields (for validating field arguments)

- `validate`: `ValidationOptions`.

### On InputObjects (for validating all fields of an input object)

- `validate`: `ValidationOptions`.

### On arguments or input object fields (for validating a specific input field or argument)

- `validate`: `ValidationOptions`.

### `RefineConstraint` and `CheckConstraints`

A `RefineConstraint` is a function that can be used to customize `valibot` schema. It receives the `ValiSchema` of args
object, input object, or specific field the refinement is defined on. It should return
an another `ValiSchema`.

```typescript
{
  email: t.arg.string(),
  phone: t.arg.string(),
  validate: {
    refine: (schema) =>
      v.pipeAsync(
        schema,
        v.forward(
          v.check(
            (args) => args.email.toLocaleLowerCase() === args.email,
            'email should be lowercase',
          ),
          ['email'],
        ),
      )
  }
}
```

`CheckConstraints` is a function, or array of fuctions, or a tuple of function and optionally error message, or array of tuples of function and optonally error message. Check function must return a `boolean` of `Promise<boolean>`.

```typescript
{
  email: t.arg.string(),
  phone: t.arg.string(),
  validate: {
    check: [
      (args) => !!args.phone || !!args.email,
      'Must provide either phone number or email address',
    ],
  }
}
```

### `ValidationOptions`

The validation options available depend on the type being validated. Each property of
`ValidationOptions` can either be a value specific to the constraint, or a tuple with the value,
and the options passed to the underlying valibot method. This options can be used to set a custom
error message:

```typescript
{
  validate: {
    maxValue: [10, 'should not be more than 10'],
    integer: true,
  }
}
```

#### Number

- `type`?: `'number'`
- `refine`?: `RefineContraint<number>`
- `check`?: `CheckConstraints<number>`
- `minValue`?: `Constraint<number>`
- `maxValue`?: `Constraint<number>`
- `integer`?: `Constraint<boolean>`
- `schema`?: `ValiSchema<number>`

#### BigInt

- `type`?: `'bigint'`
- `refine`?: `RefineConstraint<bigint>`
- `check`?: `CheckConstraints<bigint>`
- `minValue`?: `Constraint<bigint>`
- `maxValue`?: `Constraint<bigint>`
- `schema`?: `ValiSchema<bigint>`

#### Boolean

- `type`?: `'boolean'`
- `refine`?: `RefineConstraint<boolean>`
- `check`?: `CheckConstraints<boolean>`
- `schema`?: `ValiSchema<boolean>`

#### Date

- `type`?: `'boolean'`
- `refine`?: `RefineConstraint<Date>`
- `check`?: `CheckConstraints<Date>`
- `minValue`?: `Constraint<Date>`
- `maxValue`?: `Constraint<Date>`
- `schema`?: `ValiSchema<Date>`

#### File

- `type`?: `'boolean'`
- `refine`?: `RefineConstraint<File>`
- `check`?: `CheckConstraints<File>`
- `minSize`?: `Constraint<number>`
- `maxSize`?: `Constraint<number>`
- `mimeType`?: `Constraint<string[]>`
- `schema`?: `ValiSchema<File>`

#### String

- `type`?: `'string'`;
- `refine`?: `RefineConstraint<string>`
- `check`?: `CheckConstraints<string>`
- `trim`?: `boolean`
- `nonEmpty`?: `Constraint<boolean>`
- `minLength`?: `Constraint<number>`
- `maxLength`?: `Constraint<number>`
- `length`?: `Constraint<number>`
- `url`?: `Constraint<boolean>`
- `uuid`?: `Constraint<boolean>`
- `email`?: `Constraint<boolean>`
- `regex`?: `Constraint<RegExp>`
- `schema`?: `ValiSchema<string>`

#### Object

- `type`?: `'object'`;
- `refine`?: `RefineConstraint<T>`
- `check`?: `CheckConstraints<T>`
- `schema`?: `ValiSchema<T>`

#### Array

- `type`?: `'array'`;
- `refine`?: `RefineConstraint<T[]>`
- `check`?: `CheckConstraints<T[]>`
- `nonEmpty`?: `Constraint<boolean>`
- `minLength`?: `Constraint<number>`
- `maxLength`?: `Constraint<number>`
- `length`?: `Constraint<number>`
- `items`?: `ValidationOptions<T>`
- `schema`?: `ValiSchema<T[]>`

### How it works

Each arg on an object field, and each field on an input type with validation will build its own valibot
validator. These validators will be a union of all potential types that can apply the validations
defined for that field. For example, if you define an optional field with a `maxLength` validator,
it will create a valibot schema that looks something like:

```typescript
v.union([
  v.null(),
  v.undefined(),
  v.pipe(v.array(), v.maxLength(5)),
  v.pipe(v.string(), v.maxLength(5)),
]);
```

If you set and `email` validation instead the schema might look like:

```typescript
v.union([v.null(), v.undefined(), v.pipe(v.string(), v.email())]);
```

At runtime, we don't know anything about the types being used by your schema, we can't infer the
expected js type from the type definition, so the best we can do is limit the valid types based on
what validations they support. The `type` validation allows explicitly validating the `type` of a
field to be one of the base types supported by valibot:

```typescript
// field
{
validate: {
  type: 'string',
  maxLength: 5
}
// generated
v.union([v.null(), v.undefined(), v.pipe(v.string(), v.maxLength(5))]);
```

There are a few exceptions the above:

1. args and input fields that are `InputObject`s always use `v.object()` rather than creating a
   union of potential types.

2. args and input fields that are list types always use `v.array()`.

3. If you only include a `refine` or `check` validation we will
   just use `v`s unknown validator instead:

```typescript
// field
{
  validate: {
    check: (val) => isValid(val)
  },
}
// generated
v.union([v.null(), v.undefined(), v.pipe(v.unknown(), v.check((val) => isValid(val)))]);
```

If the validation options include a `schema` that schema will be used as an intersection wit the
generated validator:

```typescript
// field
{
  validate: {
    integer: true,
    schema: v.pipeAsync(v.number(), v.maxValue(10)),
  }
}
// generated
v.union([
    v.null(),
    v.undefined(),
    v.intersect([
        v.pipe(v.number(), v.maxValue(10)),
        v.pipe(v.number(), v.integer())
    ])
]);
```

### Sharing schemas with client code

The easiest way to share validators is the use the to define schemas for your fields in an external
file using the normal valibot APIs, and then attaching those to your fields using the `schema` option.

```typescript
// shared
import { ValidationOptions } from '@pothos/plugin-zod';

const numberValidation = v.pipe(v.number(), v.maxValue(5));

// server
builder.queryType({
  fields: (t) => ({
    example: t.boolean({
      args: {
        num: t.arg.int({
          validate: {
            schema: numberValidation,
          }
        }),
      },
      resolve: () => true,
    }),
  });
});

// client
v.parse(numberValidator, 3) // pass
v.parse(numberValidator, '3') // fail
```

You can also use the `createValibotSchema` helper from the plugin directly to create valibot Schemas from an
options object:

```typescript
// shared
import { ValidationOptions } from 'pothos-plugin-valibot';

const numberValidation: ValidationOptions<number> = {
  max: 5,
};

// server
builder.queryType({
  fields: (t) => ({
    example: t.boolean({
      args: {
        num: t.arg.int({
          validate: numberValidation,
        }),
      },
      resolve: () => true,
    }),
  });
});

// client
import { createValibotSchema } from 'pothos-plugin-valibot';

const validator = createValibotSchema(numberValidator);

v.parseAsync(validator, 3) // pass
v.parseAsync(validator, '3') // fail
```
