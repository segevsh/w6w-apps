import type { ActionDefinition } from "@w6w/types";
import { PROJECT, projectFields, writeOutput, writeRecord } from "../lib/records.ts";

type Input = Record<string, unknown>;

const projectUpdate: ActionDefinition<Input> = {
  key: "project-update",
  type: "perform",
  resource: "project",
  title: "Update Project",
  description:
    "Update an existing project (matched by Cloze ID, unique ID or e-mail); only the fields you set change. Cloze returns no record body.",
  idempotent: true,
  params: projectFields(),
  output: writeOutput,

  execute(input, ctx) {
    return writeRecord(ctx, PROJECT, "update", input);
  },
};

export default projectUpdate;
