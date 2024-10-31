import * as v from 'valibot'
import builder from '../builder'
import type { ValidationOptions } from '../../../src'

interface RecursiveShape {
  number: number
  recurse?: RecursiveShape
}
const Recursive = builder.inputRef<RecursiveShape>('Recursive')

const numberValidation: ValidationOptions<number> = {
  maxValue: 5,
}

Recursive.implement({
  validate: {
    check: [(fields) => fields.number !== 3, 'number must not be 3'],
  },
  fields: (t) => ({
    number: t.int({
      required: true,
      validate: numberValidation,
    }),
    float: t.float({
      required: true,
      validate: {
        check: (val) => val % 1 !== 0,
      },
    }),
    recurse: t.field({
      required: false,
      type: Recursive,
    }),
  }),
})

enum Enum1 {
  One = 0,
  Two = 1,
  Three = 2,
}

const Enum1Type = builder.enumType(Enum1, {
  name: 'Enum1',
})

const ContactInfo = builder.inputType('ContactInfo', {
  fields: (t) => ({
    name: t.string({
      required: true,
      validate: {
        maxLength: 30,
        check: [
          async (name) => Promise.resolve(name[0]?.toUpperCase() === name[0]),
          'Name should be capitalized',
        ],
      },
    }),
    aliases: t.stringList({
      validate: {
        items: {
          maxLength: 30,
        },
        check: [
          (list) => list.every((alias) => alias[0]?.toUpperCase() === alias[0]),
          'Aliases should be capitalized',
        ],
      },
    }),
    email: t.string({
      required: true,
      validate: {
        email: true,
        check: [
          (arg) => arg.split('@')[1] !== 'example.com',
          'no example.com email addresses',
        ],
      },
    }),
    phone: t.string({
      validate: {
        trim: true,
        regex: /^\d{3}-\d{3}-\d{4}$/u,
        length: 12,
      },
    }),
  }),
})

builder.queryType({
  fields: (t) => ({
    simple: t.boolean({
      nullable: true,
      args: {
        email: t.arg.string({
          validate: {
            email: true,
          },
        }),
        phone: t.arg.string({
          validate: {
            schema: v.pipe(v.string(), v.trim()),
          },
        }),
      },
      validate: {
        check: (args) => Promise.resolve(!!args.phone || !!args.email),
      },
      resolve: () => true,
    }),
    withMessage: t.boolean({
      nullable: true,
      args: {
        email: t.arg.string({
          validate: {
            email: [true, 'invalid email address'],
          },
        }),
        phone: t.arg.string(),
      },
      validate: {
        check: [
          (args) => !!args.phone || !!args.email,
          'Must provide either phone number or email address',
        ],
      },
      resolve: () => true,
    }),
    list: t.boolean({
      nullable: true,
      args: {
        list: t.arg.stringList({
          validate: {
            items: {
              maxLength: 3,
            },
            maxLength: 3,
          },
        }),
      },
      resolve: () => true,
    }),
    exampleField: t.int({
      args: {
        enum1: t.arg({
          type: [Enum1Type],
          validate: {
            check: (val) => val[0] === Enum1.One,
          },
        }),
        recursive: t.arg({
          type: Recursive,
          required: true,
        }),
        odd: t.arg.int({
          validate: {
            maxValue: 5,
            check: [(n) => n % 2 === 1, 'number must be odd'],
          },
          required: true,
        }),
        contactInfo: t.arg({
          type: ContactInfo,
          validate: {
            refine: (schema) =>
              v.pipeAsync(
                schema,
                v.forward(
                  v.check(
                    (info) => info.email.toLocaleLowerCase() === info.email,
                    'email should be lowercase',
                  ),
                  ['email'],
                ),
              ),
          },
        }),
      },
      validate: {
        refine: (schema) =>
          v.pipeAsync(
            schema,
            v.forward(
              v.check(
                (args) => (args.contactInfo?.aliases?.length ?? 0) > 1,
                'contactInfo should include at least 2 aliases',
              ),
              ['contactInfo', 'aliases'],
            ),
          ),
      },
      resolve(_parent, args) {
        return args.odd
      },
    }),
    all: t.boolean({
      description:
        'all possible validations, (these constraints cant be satisfied)',
      args: {
        number: t.arg.float({
          validate: {
            integer: true,
            minValue: 5,
            maxValue: 5,
            check: () => true,
          },
        }),
        bigint: t.arg.id({
          validate: {
            type: 'bigint',
            check: () => true,
          },
        }),
        string: t.arg.string({
          validate: {
            type: 'string',
            email: true,
            url: true,
            uuid: true,
            regex: /abc/u,
            length: 5,
            maxLength: 5,
            minLength: 5,
            trim: true,
            check: () => true,
          },
        }),
        object: t.arg({
          required: false,
          type: Recursive,
          validate: {
            check: (obj) => !obj.recurse,
          },
        }),
        array: t.arg.stringList({
          validate: {
            type: 'array',
            length: 5,
            minLength: 5,
            maxLength: 5,
            items: {
              type: 'string',
              maxLength: 5,
            },
            check: () => true,
          },
        }),
      },
      resolve: () => true,
    }),
    argsSchema: t.boolean({
      nullable: true,
      args: {
        num: t.arg.int(),
        string: t.arg.string(),
      },
      validate: {
        schema: v.object({
          num: v.pipe(v.number(), v.minValue(2)),
          string: v.pipe(v.string(), v.minLength(2)),
        }),
      },
      resolve: () => true,
    }),
  }),
})

const WithValidationInput = builder.inputType('WithValidationInput', {
  fields: (t) => ({
    name: t.string(),
    age: t.int(),
  }),
  validate: {
    check: [
      [(args) => args.name === 'secret', 'Incorrect name given'],
      [(args) => args.age === 100, 'Incorrect age given'],
    ],
  },
})
const WithValidationAndFieldValidator = builder.inputType(
  'WithValidationAndFieldValidator',
  {
    fields: (t) => ({
      name: t.string({
        validate: {
          check: () => true,
        },
      }),
      age: t.int(),
    }),
    validate: {
      check: [
        [(args) => args.name === 'secret', 'Incorrect name given'],
        [(args) => args.age === 100, 'Incorrect age given'],
      ],
    },
  },
)

const NestedInput = builder.inputType('NestedInput', {
  fields: (t) => ({ id: t.id() }),
})

const SoloNestedInput = builder.inputType('SoloNestedInput', {
  fields: (t) => ({
    nested: t.field({
      required: true,
      type: NestedInput,
      validate: {
        schema: v.object({ id: v.pipe(v.string(), v.minLength(2)) }),
      },
    }),
  }),
})

const NestedObjectListInput = builder.inputType('NestedObjectListInput', {
  fields: (t) => ({
    nested: t.field({
      required: true,
      type: [NestedInput],
      validate: {
        schema: v.array(v.object({ id: v.pipe(v.string(), v.minLength(2)) })),
      },
    }),
  }),
})

const WithSchemaInput = builder.inputType('WithSchemaInput', {
  fields: (t) => ({
    name: t.string(),
  }),
  validate: {
    schema: v.object({ name: v.pipe(v.string(), v.minLength(2)) }),
  },
})

builder.queryField('soloNested', (t) =>
  t.boolean({
    nullable: true,
    args: {
      input: t.arg({ type: SoloNestedInput }),
    },
    resolve: () => true,
  }),
)

builder.queryField('nestedObjectList', (t) =>
  t.boolean({
    nullable: true,
    args: {
      input: t.arg({ type: NestedObjectListInput }),
    },
    resolve: () => true,
  }),
)

builder.queryField('withValidationInput', (t) =>
  t.boolean({
    nullable: true,
    args: {
      input: t.arg({ type: WithValidationInput }),
    },
    resolve: () => true,
  }),
)

builder.queryField('withValidationAndFieldValidator', (t) =>
  t.boolean({
    nullable: true,
    args: {
      input: t.arg({ type: WithValidationAndFieldValidator }),
    },
    resolve: () => true,
  }),
)

builder.queryField('withSchemaInput', (t) =>
  t.boolean({
    nullable: true,
    args: {
      input: t.arg({ type: WithSchemaInput }),
    },
    resolve: () => true,
  }),
)

builder.queryField('withSchemaInputList', (t) =>
  t.boolean({
    nullable: true,
    args: {
      input: t.arg({ type: [WithSchemaInput] }),
    },
    resolve: () => true,
  }),
)

export default builder.toSchema()
