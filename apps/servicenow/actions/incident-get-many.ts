import type { ActionDefinition } from "@w6w/types";
import { ServiceNowClient, unset } from "../lib/client.ts";
import { pagination, queryParam, readOptions } from "../lib/params.ts";

interface Input {
  query?: string;
  limit?: number;
  offset?: number;
  fields?: string;
  displayValue?: string;
}

const incidentGetMany: ActionDefinition<Input> = {
  key: "incident-get-many",
  type: "search",
  resource: "incident",
  title: "List Incidents",
  description: "List incidents, optionally filtered with an encoded query.",
  params: [queryParam, ...pagination, ...readOptions],
  output: [{ key: "result", type: "array", label: "Incidents" }],

  execute(input, ctx) {
    return new ServiceNowClient(ctx).request("/table/incident", {
      query: {
        sysparm_query: unset(input.query),
        sysparm_limit: input.limit,
        sysparm_offset: input.offset,
        sysparm_fields: unset(input.fields),
        sysparm_display_value: input.displayValue,
      },
    });
  },
};

export default incidentGetMany;
