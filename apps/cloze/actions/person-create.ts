import type { ActionDefinition } from "@w6w/types";
import { PERSON, personFields, writeOutput, writeRecord } from "../lib/records.ts";

type Input = Record<string, unknown>;

const personCreate: ActionDefinition<Input> = {
  key: "person-create",
  type: "perform",
  resource: "person",
  title: "Create Person",
  description:
    "Create a person, or enhance the existing one when an ID or e-mail matches. Cloze returns no record body.",
  idempotent: true,
  params: personFields(),
  output: writeOutput,

  execute(input, ctx) {
    return writeRecord(ctx, PERSON, "create", input);
  },
};

export default personCreate;
