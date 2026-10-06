import type { ActionDefinition } from "@w6w/types";
import { compact, createdResult, KlipfolioClient } from "../lib/client.ts";

interface Input {
  name: string;
  description?: string;
  status?: string;
  seats?: number;
  custom_theme?: boolean;
  external_id?: string;
}

/** `POST /clients`. */
const clientCreate: ActionDefinition<Input> = {
  key: "client-create",
  type: "perform",
  resource: "client",
  title: "Create Client",
  description: "Create a client account (partner accounts).",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "description", label: "Description", type: "text" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [{ value: "setup", label: "Setup" }, { value: "trial", label: "Trial" }, {
        value: "active",
        label: "Active",
      }, { value: "disabled", label: "Disabled" }],
    },
    { key: "seats", label: "Seats", type: "number", validation: { min: 0, integer: true } },
    {
      key: "custom_theme",
      label: "Custom theme",
      type: "boolean",
      hint: "Only when the feature is enabled on the parent account.",
    },
    { key: "external_id", label: "External ID", type: "string" },
  ],
  output: [
    { key: "id", type: "string", label: "New resource ID" },
    { key: "location", type: "string", label: "Location path of the new resource" },
    {
      key: "instance_location",
      type: "string",
      label: "Location of the new data source instance (data sources only)",
    },
  ],

  async execute(input, ctx) {
    const env = await new KlipfolioClient(ctx).request("POST", `/clients`, {
      body: compact({
        name: input.name,
        description: input.description,
        status: input.status,
        seats: input.seats,
        custom_theme: input.custom_theme,
        external_id: input.external_id,
      }),
    });
    return createdResult(env);
  },
};

export default clientCreate;
