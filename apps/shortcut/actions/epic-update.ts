import type { ActionDefinition } from "@w6w/types";
import { compact, ShortcutClient, toStringList } from "../lib/client.ts";
import { epicIdParam } from "../lib/params.ts";

interface Input {
  epicId: number;
  name?: string;
  description?: string;
  epicStateId?: number;
  archived?: boolean;
  deadline?: string;
  ownerIds?: string | string[];
  followerIds?: string | string[];
}

const epicUpdate: ActionDefinition<Input> = {
  key: "epic-update",
  type: "perform",
  resource: "epic",
  title: "Update Epic",
  description: "Update an existing Epic. Only the fields you set are changed.",
  idempotent: true,
  params: [
    epicIdParam,
    { key: "name", label: "Name", type: "string", validation: { maxLength: 256 } },
    { key: "description", label: "Description", type: "text" },
    { key: "epicStateId", label: "Epic State ID", type: "number", validation: { integer: true } },
    { key: "archived", label: "Archived", type: "boolean" },
    { key: "deadline", label: "Deadline", type: "datetime" },
    { key: "ownerIds", label: "Owner Member UUIDs", type: "multiselect" },
    { key: "followerIds", label: "Follower Member UUIDs", type: "multiselect" },
  ],
  output: [{ key: "data", type: "object", label: "The updated Epic" }],

  execute(input, ctx) {
    return new ShortcutClient(ctx).put(
      `/epics/${input.epicId}`,
      compact({
        name: input.name,
        description: input.description,
        epic_state_id: input.epicStateId,
        archived: input.archived,
        deadline: input.deadline,
        owner_ids: toStringList(input.ownerIds),
        follower_ids: toStringList(input.followerIds),
      }),
    );
  },
};

export default epicUpdate;
