import type { ActionDefinition } from "@w6w/types";
import { KlipfolioClient, recordResult, seg } from "../lib/client.ts";

interface Input {
  client_id: string;
  full?: boolean;
}

/** `GET /clients/{client_id}`. */
const clientGet: ActionDefinition<Input> = {
  key: "client-get",
  type: "read",
  resource: "client",
  title: "Get Client",
  description: "Get one client account.",
  params: [
    { key: "client_id", label: "Client ID", type: "string", required: true },
    {
      key: "full",
      label: "Include associations",
      type: "boolean",
      hint: "Include associations (users, groups, share_right).",
    },
  ],
  output: [
    { key: "id", type: "string", label: "ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "description", type: "string", label: "Description" },
    { key: "status", type: "string", label: "Account status" },
    { key: "seats", type: "number", label: "Seats" },
    { key: "external_id", type: "string", label: "External ID" },
  ],

  async execute(input, ctx) {
    const env = await new KlipfolioClient(ctx).request("GET", `/clients/${seg(input.client_id)}`, {
      query: { full: input.full },
    });
    return recordResult(env);
  },
};

export default clientGet;
