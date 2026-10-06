import type { ActionDefinition } from "@w6w/types";
import { LeadfeederClient, reply } from "../lib/client.ts";
import { accountIdParam, dataOutput, metaOutput } from "../lib/params.ts";

interface Input {
  accountId: string;
  name: string;
  color: number;
}

/** `POST /v1/tags` — verified against the vendor OpenAPI document (2026-10-06). */
const tagCreate: ActionDefinition<Input> = {
  key: "tag-create",
  type: "perform",
  resource: "tag",
  idempotent: false,
  title: "Create Tag",
  description: "Create a tag with a name and one of the ten palette colors.",
  params: [
    accountIdParam,
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "color",
      label: "Color",
      type: "number",
      required: true,
      hint: "Palette index 0-9.",
      validation: { min: 0, max: 9, integer: true },
    },
  ],
  output: [
    dataOutput,
    metaOutput,
  ],

  async execute(input, ctx) {
    const path = "/v1/tags";
    const query = { account_id: input.accountId };
    const body = { data: { type: "tag", attributes: { name: input.name, color: input.color } } };
    return reply(await new LeadfeederClient(ctx).request("POST", path, { query, body }));
  },
};

export default tagCreate;
