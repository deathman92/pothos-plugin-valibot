import { createYoga } from "graphql-yoga";
import { buildHTTPExecutor } from "@graphql-tools/executor-http";
import { File } from "@whatwg-node/fetch";
import schema from "./schema";

globalThis.File = File;

const yoga = createYoga({
  schema,
  fetchAPI: {
    fetch: globalThis.fetch,
  },
});

const executor = buildHTTPExecutor({
  fetch: yoga.fetch,
});

export default executor;
