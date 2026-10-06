import type { ActionDefinition } from "@w6w/types";
import { getManyParams, getManyRecords, PERSON } from "../lib/records.ts";

type Input = Record<string, unknown>;

const personGetMany: ActionDefinition<Input> = {
  key: "person-get-many",
  type: "read",
  resource: "person",
  title: "Get Multiple People",
  description: "Fetch several people by ID in one call.",
  params: getManyParams(PERSON),
  output: [
    { key: "items", type: "array", label: "People" },
    { key: "count", type: "number", label: "Records returned" },
  ],

  execute(input, ctx) {
    return getManyRecords(ctx, PERSON, input);
  },
};

export default personGetMany;
