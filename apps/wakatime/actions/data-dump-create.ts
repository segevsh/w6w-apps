import type { ActionDefinition } from "@w6w/types";
import { compact, USER, WakaClient } from "../lib/client.ts";

interface Input {
  type: string;
  emailWhenFinished?: boolean;
}

/** `POST /api/v1/users/current/data_dumps` */
const dataDumpCreate: ActionDefinition<Input> = {
  key: "data-dump-create",
  type: "perform",
  resource: "data-dump",
  title: "Create Data Export",
  description:
    "Start generating a data export in the background; poll List Data Exports for completion.",
  idempotent: false,
  params: [
    {
      key: "type",
      label: "Export type",
      type: "select",
      required: true,
      hint: "daily = per-day summaries, heartbeats = raw heartbeats.",
      options: [{ value: "daily", label: "Daily summaries" }, {
        value: "heartbeats",
        label: "Heartbeats",
      }],
    },
    {
      key: "emailWhenFinished",
      label: "Email when finished",
      type: "boolean",
      hint: "Defaults to true.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "The export (id, status, percent_complete)" },
  ],

  execute(input, ctx) {
    return new WakaClient(ctx).request("POST", `${USER}/data_dumps`, {
      body: compact({ type: input.type, email_when_finished: input.emailWhenFinished }),
    });
  },
};

export default dataDumpCreate;
