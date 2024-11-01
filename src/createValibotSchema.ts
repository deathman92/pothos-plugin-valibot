import { PothosSchemaError } from "@pothos/core";
import * as v from "valibot";
import type {
  ArrayValidationOptions,
  BaseValidationOptions,
  NumberValidationOptions,
  StringValidationOptions,
  ValidationOptionUnion,
  ValiSchema,
} from "./types";

const baseValidations = ["refine", "schema", "check"] as const;
const numberValidations = [
  ...baseValidations,
  "integer",
  "maxValue",
  "minValue",
  "type",
] as const;
const bigIntValidations = [
  ...baseValidations,
  "maxValue",
  "minValue",
  "type",
] as const;

const booleanValidations = [...baseValidations, "type"] as const;

const dateValidations = [
  ...baseValidations,
  "maxValue",
  "minValue",
  "type",
] as const;

const stringValidations = [
  ...baseValidations,
  "trim",
  "nonEmpty",
  "email",
  "length",
  "maxLength",
  "minLength",
  "regex",
  "type",
  "url",
  "uuid",
] as const;
const arrayValidations = [
  ...baseValidations,
  "items",
  "nonEmpty",
  "length",
  "maxLength",
  "minLength",
  "type",
] as const;

const objectValidations = [...baseValidations, "type"] as const;

function validatorCreator<T extends BaseValidationOptions<any>>(
  type: NonNullable<T["type"]>,
  validationNames: readonly (keyof T)[],
  create: (options: T) => ValiSchema<any>
) {
  function check(options: ValidationOptionUnion): options is T {
    if (
      typeof options !== "object" ||
      (options.type && options.type !== type)
    ) {
      return false;
    }

    const validations = Object.keys(options);

    return validations.every((validation) =>
      validationNames.includes(validation as keyof T)
    );
  }

  return (options: ValidationOptionUnion) => {
    if (check(options)) {
      return create(options);
    }

    return null;
  };
}

export function refine(
  originalValidator: ValiSchema<any>,
  options: ValidationOptionUnion | null | undefined
): ValiSchema<any> {
  if (!options) {
    return originalValidator;
  }

  let validator = originalValidator;

  if (options.schema) {
    validator = v.intersectAsync([originalValidator, options.schema]);
  }

  if (options.refine) {
    validator = options.refine(validator as any);
  }

  if (!options.check) {
    return validator;
  }

  if (typeof options.check === "function") {
    return v.pipeAsync(validator, v.checkAsync(options.check as any));
  }

  // @ts-ignore
  if (typeof options.check?.[0] === "function") {
    const [checkFn, errorMessage] = options.check as [
      () => boolean,
      v.ErrorMessage<any>
    ];
    return v.pipeAsync(validator, v.checkAsync(checkFn, errorMessage));
  }

  const checks = options.check as [() => boolean, v.ErrorMessage<any>][];

  return checks.reduce(
    (prev, [checkFn, errorMessage]) =>
      v.pipeAsync(prev, v.checkAsync(checkFn, errorMessage)),
    validator
  );
}

export const createNumberValidator = validatorCreator(
  "number",
  numberValidations,
  (options: NumberValidationOptions) => {
    let validator = v.number() as ValiSchema<number>;

    if (options.integer) {
      validator = v.pipeAsync(
        validator,
        v.integer(
          Array.isArray(options.integer) ? options.integer[1] : undefined
        )
      );
    }

    if (options.minValue) {
      validator = v.pipeAsync(
        validator,
        Array.isArray(options.minValue)
          ? v.minValue(Number(options.minValue[0]), options.minValue[1])
          : v.minValue(Number(options.minValue))
      );
    }

    if (options.maxValue) {
      validator = v.pipeAsync(
        validator,
        Array.isArray(options.maxValue)
          ? v.maxValue(Number(options.maxValue[0]), options.maxValue[1])
          : v.maxValue(Number(options.maxValue))
      );
    }

    return refine(validator, options);
  }
);

export const createBigintValidator = validatorCreator(
  "bigint",
  bigIntValidations,
  (options) => {
    let validator = v.bigint() as ValiSchema<bigint>;

    if (options.minValue) {
      validator = v.pipeAsync(
        validator,
        Array.isArray(options.minValue)
          ? v.minValue(BigInt(options.minValue[0]), options.minValue[1])
          : v.minValue(BigInt(options.minValue))
      );
    }

    if (options.maxValue) {
      validator = v.pipeAsync(
        validator,
        Array.isArray(options.maxValue)
          ? v.maxValue(BigInt(options.maxValue[0]), options.maxValue[1])
          : v.maxValue(BigInt(options.maxValue))
      );
    }

    return refine(validator, options);
  }
);

export const createBooleanValidator = validatorCreator(
  "boolean",
  booleanValidations,
  (options) => refine(v.boolean(), options)
);

export const createDateValidator = validatorCreator(
  "date",
  dateValidations,
  (options) => {
    let validator = v.date() as ValiSchema<Date>;

    if (options.minValue) {
      validator = v.pipeAsync(
        validator,
        Array.isArray(options.minValue)
          ? v.minValue(new Date(options.minValue[0]), options.minValue[1])
          : v.minValue(new Date(options.minValue))
      );
    }

    if (options.maxValue) {
      validator = v.pipeAsync(
        validator,
        Array.isArray(options.maxValue)
          ? v.maxValue(new Date(options.maxValue[0]), options.maxValue[1])
          : v.maxValue(new Date(options.maxValue))
      );
    }

    return refine(validator, options);
  }
);

export const createStringValidator = validatorCreator(
  "string",
  stringValidations,
  (options: StringValidationOptions) => {
    let validator = v.string() as ValiSchema<string>;

    if (options.trim) {
      validator = v.pipeAsync(validator, v.trim());
    }

    const booleanConstraints = ["nonEmpty", "email", "url", "uuid"] as const;

    for (const constraint of booleanConstraints) {
      if (options[constraint]) {
        const value = options[constraint];

        validator = v.pipeAsync(
          validator,
          // @ts-ignore
          v[constraint](Array.isArray(value) ? value[1] : undefined)
        );
      }
    }

    if (options.length !== undefined) {
      validator = v.pipeAsync(
        validator,
        Array.isArray(options.length)
          ? v.length(Number(options.length[0]), options.length[1])
          : v.length(Number(options.length))
      );
    }

    if (options.minLength) {
      validator = v.pipeAsync(
        validator,
        Array.isArray(options.minLength)
          ? v.minLength(Number(options.minLength[0]), options.minLength[1])
          : v.minLength(Number(options.minLength))
      );
    }

    if (options.maxLength) {
      validator = v.pipeAsync(
        validator,
        Array.isArray(options.maxLength)
          ? v.maxLength(Number(options.maxLength[0]), options.maxLength[1])
          : v.maxLength(Number(options.maxLength))
      );
    }

    if (options.regex) {
      validator = v.pipeAsync(
        validator,
        Array.isArray(options.regex)
          ? v.regex(options.regex[0], options.regex[1])
          : v.regex(options.regex)
      );
    }

    return refine(validator, options);
  }
);

export function isArrayValidator(
  options: ValidationOptionUnion
): options is ArrayValidationOptions {
  if (
    typeof options !== "object" ||
    (options.type && options.type !== "array")
  ) {
    return false;
  }

  const validations = Object.keys(options);

  return validations.every((validation) =>
    arrayValidations.includes(validation as keyof ArrayValidationOptions)
  );
}

export function createArrayValidator(
  options: ArrayValidationOptions<unknown[]>,
  items: ValiSchema<any>
) {
  let validator = v.arrayAsync(items);

  if (options.nonEmpty) {
    validator = v.pipeAsync(
      validator,
      v.nonEmpty(
        Array.isArray(options.nonEmpty) ? options.nonEmpty[1] : undefined
      )
    );
  }

  if (options.length !== undefined) {
    validator = v.pipeAsync(
      validator,
      Array.isArray(options.length)
        ? v.length(Number(options.length[0]), options.length[1])
        : v.length(Number(options.length))
    );
  }

  if (options.minLength) {
    validator = v.pipeAsync(
      validator,
      Array.isArray(options.minLength)
        ? v.minLength(Number(options.minLength[0]), options.minLength[1])
        : v.minLength(Number(options.minLength))
    );
  }

  if (options.maxLength) {
    validator = v.pipeAsync(
      validator,
      Array.isArray(options.maxLength)
        ? v.maxLength(Number(options.maxLength[0]), options.maxLength[1])
        : v.maxLength(Number(options.maxLength))
    );
  }

  return refine(validator, options);
}

export const createObjectValidator = validatorCreator(
  "object",
  objectValidations,
  (options) => refine(v.looseObject({}), options)
);

const validationCreators = [
  createNumberValidator,
  createBigintValidator,
  createBooleanValidator,
  createDateValidator,
  createStringValidator,
  createObjectValidator,
];

export function isBaseValidator(options: ValidationOptionUnion) {
  const validations = Object.keys(options);

  return validations.every((validation) =>
    baseValidations.includes(
      validation as Exclude<keyof BaseValidationOptions, "type">
    )
  );
}

export function combine(validators: ValiSchema<any>[], required: boolean) {
  const union =
    validators.length > 1
      ? v.unionAsync(validators as [ValiSchema<any>, ValiSchema<any>])
      : validators[0]!;

  return required ? union : v.nullishAsync(union);
}

export default function createValibotSchema(
  options: ValidationOptionUnion | null | undefined,
  required = false
): ValiSchema<any> {
  if (!options) {
    return v.unknown();
  }

  if (isBaseValidator(options)) {
    return combine([refine(v.unknown(), options)], required);
  }

  const typeValidators = validationCreators
    .map((create) => create(options))
    .filter(Boolean) as ValiSchema<any>[];

  if (isArrayValidator(options)) {
    const items = options.items
      ? createValibotSchema(options.items)
      : v.unknown();
    typeValidators.push(createArrayValidator(options, items));
  }

  if (typeValidators.length === 0) {
    throw new PothosSchemaError(
      `No type validator can implement every constraint in (${Object.keys(
        options
      )})`
    );
  }

  return combine([...typeValidators], required);
}
