import type { ActionDefinition } from "@w6w/types";
import { PERSON, personFields, writeOutput, writeRecord } from "../lib/records.ts";

type Input = Record<string, unknown>;

const personUpdate: ActionDefinition<Input> = {
  key: "person-update",
  type: "perform",
  resource: "person",
  title: "Update Person",
  description:
    "Update an existing person (matched by Cloze ID, unique ID or e-mail); only the fields you set change. Cloze returns no record body.",
  idempotent: true,
  params: personFields(),
  output: writeOutput,

  execute(input, ctx) {
    return writeRecord(ctx, PERSON, "update", input);
  },
};

export default personUpdate;
