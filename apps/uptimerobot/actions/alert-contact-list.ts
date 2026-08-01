import type { ActionDefinition } from "@w6w/types";
import { UptimeRobotClient } from "../lib/client.ts";

interface Input {
  alertContacts?: string;
  limit?: number;
  offset?: number;
}

interface Output {
  alertContacts: unknown[];
}

/** POST /getAlertContacts — list (or narrow, via dash-separated ids) alert contacts. */
const alertContactList: ActionDefinition<Input, Output> = {
  key: "alert-contact-list",
  type: "read",
  resource: "alert-contact",
  title: "List Alert Contacts",
  description: "List alert contacts configured on the account.",
  params: [
    {
      key: "alertContacts",
      label: "Alert Contact IDs",
      type: "string",
      hint: "Dash-separated IDs to narrow the list, e.g. 236-1782-4790. Leave blank for all.",
      advanced: true,
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      advanced: true,
      validation: { min: 1, max: 100 },
    },
    { key: "offset", label: "Offset", type: "number", advanced: true },
  ],
  output: [{ key: "alertContacts", type: "array", label: "Alert Contacts" }],

  async execute(input, ctx) {
    const client = new UptimeRobotClient(ctx);
    const res = await client.request<
      { stat: "ok"; alert_contacts: unknown[] } & Record<string, unknown>
    >("/getAlertContacts", {
      alert_contacts: input.alertContacts,
      limit: input.limit,
      offset: input.offset,
    });
    return { alertContacts: res.alert_contacts };
  },
};

export default alertContactList;
