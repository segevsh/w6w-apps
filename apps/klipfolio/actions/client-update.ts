import type { ActionDefinition } from "@w6w/types";
import { compact, KlipfolioClient, okResult, seg } from "../lib/client.ts";

interface Input {
  client_id: string;
  name?: string;
  description?: string;
  status?: string;
  seats?: number;
  custom_theme?: boolean;
  external_id?: string;
}

/** `PUT /clients/{client_id}`. */
const clientUpdate: ActionDefinition<Input> = {
  key: "client-update",
  type: "perform",
  resource: "client",
  title: "Update Client",
  description: "Update a client account; only the fields you set are sent.",
  idempotent: true,
  params: [
    { key: "client_id", label: "Client ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string" },
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
    { key: "success", type: "boolean", label: "Whether the call succeeded" },
    { key: "op", type: "string", label: "Operation echoed back, when the API reports one" },
  ],

  async execute(input, ctx) {
    const env = await new KlipfolioClient(ctx).request("PUT", `/clients/${seg(input.client_id)}`, {
      body: compact({
        name: input.name,
        description: input.description,
        status: input.status,
        seats: input.seats,
        custom_theme: input.custom_theme,
        external_id: input.external_id,
      }),
    });
    return okResult(env);
  },
};

export default clientUpdate;
