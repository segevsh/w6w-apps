import type { ActionDefinition } from "@w6w/types";
import { AccuLynxClient, encodeId } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

interface Input {
  countryId: string;
}

const action: ActionDefinition<Input> = {
  key: "state-list",
  type: "read",
  resource: "reference",
  title: "List States",
  description: "List a country's states; ids feed contact addresses.",
  params: [
    idParam("countryId", "Country id", "From List Countries."),
  ],
  output: [{ key: "items", type: "array", label: "States (id, name, abbreviation)" }],

  async execute(input, ctx) {
    return await new AccuLynxClient(ctx).get(
      `/acculynx/countries/${encodeId(input.countryId)}/states`,
    );
  },
};

export default action;
