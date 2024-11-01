import "../../src";
import { createGraphQLError } from "graphql-yoga";
import SchemaBuilder from "@pothos/core";
import * as v from "valibot";

export default new SchemaBuilder<{
  Scalars: {
    ID: { Input: bigint | number | string; Output: bigint | number | string };
    File: { Input: File; Output: never };
  };
}>({
  plugins: ["valibot"],
  valibot: {
    validationError: (error) =>
      createGraphQLError(
        error.issues
          .map((issue) => `${v.getDotPath(issue)}: ${issue.message}`)
          .join(", ")
      ),
  },
});
