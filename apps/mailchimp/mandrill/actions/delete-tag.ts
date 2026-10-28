import type { ActionDefinition } from "@w6w/types";
import { MandrillClient } from "../lib/client.ts";

interface Input {
  tag: string;
}

const deleteTag: ActionDefinition<Input> = {
  key: "delete-tag",
  type: "perform",
  resource: "tag",
  title: "Delete Tag",
  description:
    "Permanently delete a tag, removing it from any messages it was applied to and deleting its stats (POST /tags/delete.json).",
  idempotent: true,
  params: [
    { key: "tag", label: "Tag", type: "string", required: true },
  ],
  output: [
    { key: "tag", type: "string", label: "Tag" },
    { key: "reputation", type: "number", label: "Reputation" },
    { key: "sent", type: "number", label: "Sent" },
  ],

  execute(input, ctx) {
    const client = new MandrillClient(ctx);
    return client.request("/tags/delete.json", { tag: input.tag });
  },
};

export default deleteTag;
