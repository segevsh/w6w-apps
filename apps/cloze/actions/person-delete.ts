import type { ActionDefinition } from "@w6w/types";
import { deleteParams, deleteRecord, PERSON } from "../lib/records.ts";

type Input = Record<string, unknown>;

const personDelete: ActionDefinition<Input> = {
  key: "person-delete",
  type: "perform",
  resource: "person",
  title: "Delete Person",
  description: "Delete a person. This cannot be undone.",
  idempotent: true,
  params: deleteParams(PERSON),
  output: [
    { key: "deleted", type: "boolean", label: "Deleted" },
    { key: "id", type: "string", label: "ID deleted" },
  ],

  execute(input, ctx) {
    return deleteRecord(ctx, PERSON, input);
  },
};

export default personDelete;
