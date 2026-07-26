import type { ActionDefinition } from "@w6w/types";
import { TrelloClient, unset } from "../lib/client.ts";

interface Input {
  id: string;
  name?: string;
  desc?: string;
  closed?: boolean;
  subscribed?: boolean;
  prefsPermissionLevel?: string;
}

const boardUpdate: ActionDefinition<Input> = {
  key: "board-update",
  type: "perform",
  resource: "board",
  title: "Update Board",
  description: "Rename, re-describe, archive or change the visibility of a board.",
  // A PUT writes absolute values, so replaying it converges on the same board.
  idempotent: true,
  params: [
    { key: "id", label: "Board ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string" },
    { key: "desc", label: "Description", type: "text", config: { multiline: true } },
    { key: "closed", label: "Archived", type: "boolean" },
    { key: "subscribed", label: "Subscribed", type: "boolean" },
    {
      key: "prefsPermissionLevel",
      label: "Visibility",
      type: "select",
      options: [
        { value: "private", label: "Private" },
        { value: "org", label: "Workspace" },
        { value: "public", label: "Public" },
      ],
    },
  ],
  output: [
    { key: "id", type: "string", label: "Board ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  execute(input, ctx) {
    return new TrelloClient(ctx).request(`/boards/${encodeURIComponent(input.id)}`, {
      method: "PUT",
      query: {
        name: unset(input.name),
        desc: unset(input.desc),
        closed: input.closed,
        subscribed: input.subscribed,
        "prefs/permissionLevel": unset(input.prefsPermissionLevel),
      },
    });
  },
};

export default boardUpdate;
