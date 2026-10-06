import type { ActionDefinition } from "@w6w/types";
import { PROJECT, projectFields, writeOutput, writeRecord } from "../lib/records.ts";

type Input = Record<string, unknown>;

const projectCreate: ActionDefinition<Input> = {
  key: "project-create",
  type: "perform",
  resource: "project",
  title: "Create Project",
  description:
    "Create a project, or enhance the existing one when an ID or e-mail matches. Cloze returns no record body.",
  idempotent: true,
  params: projectFields(),
  output: writeOutput,

  execute(input, ctx) {
    return writeRecord(ctx, PROJECT, "create", input);
  },
};

export default projectCreate;
