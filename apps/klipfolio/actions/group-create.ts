import type { ActionDefinition } from "@w6w/types";
import { compact, createdResult, KlipfolioClient } from "../lib/client.ts";

interface Input {
  name: string;
  description?: string;
  client_id?: string;
}

/** `POST /groups`. */
const groupCreate: ActionDefinition<Input> = {
  key: "group-create",
  type: "perform",
  resource: "group",
  title: "Create Group",
  description: "Create a group; the new ID comes back in `id`.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "description", label: "Description", type: "text" },
    {
      key: "client_id",
      label: "Client ID",
      type: "string",
      hint: "Act on a client account instead of the company account. Partner accounts only.",
    },
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
    const env = await new KlipfolioClient(ctx).request("POST", `/groups`, {
      body: compact({
        name: input.name,
        description: input.description,
        client_id: input.client_id,
      }),
    });
    return createdResult(env);
  },
};

export default groupCreate;
