import type { ActionDefinition } from "@w6w/types";
import { objectInput, query, requiredString } from "../lib/client.ts";

const action: ActionDefinition = {
  key: "graphql-query",
  type: "perform",
  idempotent: false,
  resource: "graphql",
  title: "Run GraphQL query",
  description:
    "Send a native GraphQL document and variables. Returns data; any GraphQL error fails the action. Arbitrary documents are not automatically retried.",
  params: [
    {
      key: "query",
      label: "Query",
      type: "code",
      ui: "code:graphql",
      required: true,
      placeholder: "query { viewer { id name } }",
      hint: "Use GraphQL variables for workflow values.",
    },
    {
      key: "variables",
      label: "Variables",
      type: "json",
      hint: "JSON object matching the query's variable declarations.",
    },
    {
      key: "operationName",
      label: "Operation name",
      type: "string",
      advanced: true,
      hint: "Required by GraphQL when the document contains multiple operations.",
    },
  ],
  output: [{ key: "data", type: "object", label: "GraphQL data" }],
  async execute(input, ctx) {
    const document = requiredString(input.query, "query");
    const variables = objectInput(input.variables, "variables");
    const operationName = input.operationName === undefined || input.operationName === ""
      ? undefined
      : requiredString(input.operationName, "operationName");
    return { data: await query(ctx, document, variables, operationName) };
  },
};
export default action;
