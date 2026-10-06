import type { ActionDefinition } from "@w6w/types";
import { VboutClient } from "../lib/client.ts";

/**
 * `GET /1/emailmarketing/getlist.json` — Return one contact list by ID.
 */
interface Input {
  id: string;
}

const listGet: ActionDefinition<Input> = {
  key: "list-get",
  type: "read",
  resource: "list",
  title: "Get Contact List",
  description: "Return one contact list by ID.",
  params: [
    {
      key: "id",
      label: "List ID",
      type: "string",
      required: true,
    },
  ],
  output: [
    { key: "list", type: "object", label: "The list" },
  ],

  async execute(input, ctx) {
    return await new VboutClient(ctx).get("emailmarketing/getlist", {
      id: input.id,
    });
  },
};

export default listGet;
