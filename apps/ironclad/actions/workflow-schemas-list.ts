import type { ActionDefinition } from "@w6w/types";
import { IroncladClient } from "../lib/client.ts";

type Input = Record<string, never>;

const workflowSchemasList: ActionDefinition<Input> = {
  key: "workflow-schemas-list",
  type: "read",
  resource: "workflow",
  title: "List Workflow Schemas",
  description:
    "List the workflow templates you can launch, each with the fields of its launch form.",
  params: [],
  output: [{ key: "list", type: "array", label: "Workflow schemas" }],

  execute(_input, ctx) {
    return new IroncladClient(ctx).json("/workflow-schemas", {
      // `form` is required by the API, and "launch" is the only value it supports.
      query: { form: "launch" },
    });
  },
};

export default workflowSchemasList;
