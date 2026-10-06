import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, SavvyCalClient } from "../lib/client.ts";

interface Input {
  linkId: string;
  name?: string;
  description?: string;
  privateName?: string;
  type?: string;
}

const linkUpdate: ActionDefinition<Input> = {
  key: "link-update",
  type: "perform",
  resource: "link",
  title: "Update Scheduling Link",
  description: "Update a scheduling link's name, description, private name or type.",
  idempotent: true,
  params: [
    { key: "linkId", label: "Link ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string" },
    { key: "description", label: "Description", type: "text" },
    { key: "privateName", label: "Private name", type: "string" },
    {
      key: "type",
      label: "Type",
      type: "select",
      options: [{ value: "recurring", label: "recurring" }, { value: "single", label: "single" }],
    },
  ],
  output: [{ key: "id", type: "string", label: "Link ID" }],

  execute(input, ctx) {
    return new SavvyCalClient(ctx).json(`/links/${encodeId(input.linkId)}`, {
      method: "PATCH",
      body: compact({
        name: input.name,
        description: input.description,
        private_name: input.privateName,
        type: input.type,
      }),
    });
  },
};

export default linkUpdate;
