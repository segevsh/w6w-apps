import type { ActionDefinition } from "@w6w/types";
import { ServiceNowClient, unset } from "../lib/client.ts";
import { readOptions } from "../lib/params.ts";

interface Input {
  sysId: string;
  fields?: string;
  displayValue?: string;
}

const incidentGet: ActionDefinition<Input> = {
  key: "incident-get",
  type: "read",
  resource: "incident",
  title: "Get Incident",
  description: "Read one incident by sys_id.",
  params: [
    {
      key: "sysId",
      label: "Sys ID",
      type: "string",
      required: true,
      hint:
        "The record's sys_id — not the INC number. Use `incident-get-many` with a query on `number` to look it up.",
    },
    ...readOptions,
  ],
  output: [{ key: "result", type: "object", label: "Incident" }],

  execute(input, ctx) {
    return new ServiceNowClient(ctx).request(`/table/incident/${encodeURIComponent(input.sysId)}`, {
      query: {
        sysparm_fields: unset(input.fields),
        sysparm_display_value: input.displayValue,
      },
    });
  },
};

export default incidentGet;
