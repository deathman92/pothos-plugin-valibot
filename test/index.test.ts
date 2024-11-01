import { describe, it, expect } from "vitest";
import { gql } from "graphql-tag";
import executor from "./example/executor";
import createMockFile from "./utils/createMockFile";

describe("validation", () => {
  it("valid query", async () => {
    const query = gql`
      query Valid($file: File) {
        exampleField(
          odd: 1
          recursive: {
            float: 1.1
            number: 2
            recurse: { float: 1.1, number: 1 }
          }
          contactInfo: {
            name: "Deathman"
            email: "deathman@test.com"
            phone: " 555-123-4567 "
            aliases: ["Deathman92", "Deathman2292"]
            avatar: $file
          }
          enum1: [One, Two]
        )
      }
    `;

    const result = await executor({
      document: query,
      variables: {
        file: createMockFile({ name: "avatar.png", type: "image/png" }),
      },
    });

    expect(result).toMatchInlineSnapshot(`
      {
        "data": {
          "exampleField": 1,
        },
      }
    `);
  });

  it("invalid query", async () => {
    const query = gql`
      query Invalid($file: File) {
        exampleField(
          odd: 2
          recursive: {
            float: 1
            number: 2
            recurse: { float: 1, number: 6, recurse: { float: 1.1, number: 3 } }
          }
          contactInfo: {
            name: "deathman"
            email: "Deathman@example.com"
            phone: " 555-123-456 "
            aliases: ["deathman92"]
            avatar: $file
          }
          enum1: [Two, One]
        )
      }
    `;

    const result = await executor({
      document: query,
      variables: {
        file: createMockFile({ name: "invalid.txt", size: 1024 * 1024 * 3 }),
      },
    });

    expect(result).toMatchInlineSnapshot(`
      {
        "data": {
          "exampleField": null,
        },
        "errors": [
          [GraphQLError: enum1: Invalid input: Received Array, recursive.float: Invalid input: Received 1, recursive.recurse.number: Invalid value: Expected <=5 but received 6, recursive.recurse.float: Invalid input: Received 1, recursive.recurse.recurse: number must not be 3, odd: number must be odd, contactInfo.name: Name should be capitalized, contactInfo.aliases: Aliases should be capitalized, contactInfo.email: no example.com email addresses, contactInfo.phone: Invalid length: Expected 12 but received 11, contactInfo.phone: Invalid format: Expected /^\\d{3}-\\d{3}-\\d{4}$/u but received "555-123-456", contactInfo.avatar: Invalid size: Expected <=2097152 but received 3145728, contactInfo.avatar: Avatar must be an image, contactInfo.email: email should be lowercase, contactInfo.aliases: contactInfo should include at least 2 aliases],
        ],
      }
    `);
  });

  it("example queries", async () => {
    const query = gql`
      query {
        simpleValid: simple(email: "abc@def.com")
        simpleInvalid: simple(email: "abc")
        simpleInvalid2: simple
        messageValid: withMessage(email: "abc@def.com")
        messageInvalid: withMessage(email: "abc")
        messageInvalid2: withMessage
        listValid: list(list: ["abc", "def", "ghi"])
        listInvalid: list(list: ["abcdef", "ghi"])
        listInvalid2: list(list: ["a", "b", "c", "d"])
      }
    `;

    const result = await executor({
      document: query,
    });

    expect(result).toMatchInlineSnapshot(`
      {
        "data": {
          "listInvalid": null,
          "listInvalid2": null,
          "listValid": true,
          "messageInvalid": null,
          "messageInvalid2": null,
          "messageValid": true,
          "simpleInvalid": null,
          "simpleInvalid2": null,
          "simpleValid": true,
        },
        "errors": [
          [GraphQLError: null: Invalid input: Received Object],
          [GraphQLError: null: Must provide either phone number or email address],
          [GraphQLError: email: Invalid email: Received "abc"],
          [GraphQLError: email: invalid email address],
          [GraphQLError: list: Invalid length: Expected <=3 but received 4],
          [GraphQLError: list.0: Invalid length: Expected <=3 but received 6],
        ],
      }
    `);
  });

  it("input object with schema", async () => {
    const query = gql`
      query {
        invalid: soloNested(input: { nested: { id: "1" } })
        valid: soloNested(input: { nested: { id: "12" } })
        invalidList: nestedObjectList(input: { nested: [{ id: "1" }] })
        validList: nestedObjectList(input: { nested: [{ id: "12" }] })
      }
    `;

    const result = await executor({
      document: query,
    });

    expect(result).toMatchInlineSnapshot(`
      {
        "data": {
          "invalid": null,
          "invalidList": null,
          "valid": true,
          "validList": true,
        },
        "errors": [
          [GraphQLError: input.nested.id: Invalid length: Expected >=2 but received 1],
          [GraphQLError: input.nested.0.id: Invalid length: Expected >=2 but received 1],
        ],
      }
    `);
  });

  it("input object with input", async () => {
    const query = gql`
      query {
        withValidationInput(input: { name: "secret", age: 100 })
        withValidationInputInvalid: withValidationInput(
          input: { name: "not secret", age: 101 }
        )
        withValidationInputInvalid2: withValidationInput(
          input: { name: "not secret", age: 100 }
        )
        withValidationInputInvalid3: withValidationInput(
          input: { name: "secret", age: 101 }
        )
        withValidationAndFieldValidator(input: { name: "secret", age: 100 })
        withValidationAndFieldValidatorInvalid: withValidationAndFieldValidator(
          input: { name: "not secret", age: 101 }
        )
      }
    `;

    const result = await executor({
      document: query,
    });

    expect(result).toMatchInlineSnapshot(`
      {
        "data": {
          "withValidationAndFieldValidator": true,
          "withValidationAndFieldValidatorInvalid": null,
          "withValidationInput": true,
          "withValidationInputInvalid": null,
          "withValidationInputInvalid2": null,
          "withValidationInputInvalid3": null,
        },
        "errors": [
          [GraphQLError: input: Incorrect name given, input: Incorrect age given],
          [GraphQLError: input: Incorrect name given],
          [GraphQLError: input: Incorrect age given],
          [GraphQLError: input: Incorrect name given, input: Incorrect age given],
        ],
      }
    `);
  });

  it("schema on field", async () => {
    const query = gql`
      query {
        valid: argsSchema(num: 3, string: "abc")
        invalid: argsSchema(num: 1, string: "a")
        validInput: withSchemaInput(input: { name: "abc" })
        validInputList: withSchemaInputList(input: [{ name: "abc" }])
        invalidInput: withSchemaInput(input: { name: "a" })
        invalidInputList: withSchemaInputList(input: [{ name: "a" }])
      }
    `;

    const result = await executor({
      document: query,
    });

    expect(result).toMatchInlineSnapshot(`
      {
        "data": {
          "invalid": null,
          "invalidInput": null,
          "invalidInputList": null,
          "valid": true,
          "validInput": true,
          "validInputList": true,
        },
        "errors": [
          [GraphQLError: num: Invalid value: Expected >=2 but received 1, string: Invalid length: Expected >=2 but received 1],
          [GraphQLError: input.name: Invalid length: Expected >=2 but received 1],
          [GraphQLError: input.0.name: Invalid length: Expected >=2 but received 1],
        ],
      }
    `);
  });
});
