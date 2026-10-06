import type { ActionDefinition } from "@w6w/types";
import { KlipfolioClient, recordResult, seg } from "../lib/client.ts";

interface Input {
  klip_id: string;
  full?: boolean;
  client_id?: string;
}

/** `GET /klips/{klip_id}`. */
const klipGet: ActionDefinition<Input> = {
  key: "klip-get",
  type: "read",
  resource: "klip",
  title: "Get Klip",
  description: "Get one klip by ID.",
  params: [
    { key: "klip_id", label: "Klip ID", type: "string", required: true },
    {
      key: "full",
      label: "Include associations",
      type: "boolean",
      hint: "Include associations (share_rights).",
    },
    {
      key: "client_id",
      label: "Client ID",
      type: "string",
      hint: "Act on a client account instead of the company account. Partner accounts only.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "description", type: "string", label: "Description" },
    { key: "company", type: "string", label: "Owning company" },
    { key: "created_by", type: "string", label: "Creator user ID" },
    { key: "date_created", type: "string", label: "Created (UTC)" },
    { key: "last_updated", type: "string", label: "Last updated (UTC)" },
  ],

  async execute(input, ctx) {
    const env = await new KlipfolioClient(ctx).request("GET", `/klips/${seg(input.klip_id)}`, {
      query: { full: input.full, client_id: input.client_id },
    });
    return recordResult(env);
  },
};

export default klipGet;
