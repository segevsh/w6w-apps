import type { ActionDefinition } from "@w6w/types";
import { AccuLynxClient } from "../lib/client.ts";
import { includesParam } from "../lib/params.ts";

interface Input {
  includes?: string;
}

const action: ActionDefinition<Input> = {
  key: "country-list",
  type: "read",
  resource: "reference",
  title: "List Countries",
  description: "List the countries AccuLynx supports; ids feed contact addresses.",
  params: [
    includesParam("states"),
  ],
  output: [{ key: "items", type: "array", label: "Countries (id, name, abbreviation)" }],

  async execute(input, ctx) {
    return await new AccuLynxClient(ctx).get("/acculynx/countries", {
      includes: input.includes,
    });
  },
};

export default action;
