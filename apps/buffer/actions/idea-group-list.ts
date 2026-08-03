import type { ActionDefinition } from "@w6w/types";
import { BufferClient } from "../lib/client.ts";
import { organizationIdParam } from "../lib/params.ts";

/**
 * `query ideaGroups(input: IdeaGroupsInput!)` — the columns of the idea board.
 *
 * *"Idea groups are used to organize ideas in the board."* Three fields, and
 * all three are worth having: `id` (what `idea-list` and `idea-create` filter
 * and file by), `name`, and `isLocked`.
 *
 * `IdeaGroupsInput` has one field, `organizationId`, and the return type is a
 * plain `[IdeaGroup!]!` — not a connection, so no pagination, same as
 * `channels`.
 *
 * There is no mutation for groups anywhere in the schema: no `createIdeaGroup`,
 * no rename, no delete. Groups are made in Buffer's UI and only read here. That
 * is a property of the API, not an omission in this app — the complete root
 * mutation list is `createPost`, `editPost`, `deletePost`, `createIdea`,
 * `movePostInQueue`, and the four post-template mutations.
 */
const IDEA_GROUPS = `query W6wIdeaGroups($input: IdeaGroupsInput!) {
  ideaGroups(input: $input) {
    id
    name
    isLocked
  }
}`;

interface Input {
  organizationId: string;
}

const ideaGroupList: ActionDefinition<Input> = {
  key: "idea-group-list",
  type: "read",
  resource: "idea",
  title: "List Idea Groups",
  description:
    "The groups (board columns) ideas can be filed under. Read-only — Buffer has no mutation " +
    "for creating or renaming a group.",
  params: [organizationIdParam],
  output: [
    { key: "ideaGroups", type: "array", label: "Idea groups" },
    { key: "ideaGroups[].id", type: "string", label: "Group ID" },
    { key: "ideaGroups[].name", type: "string", label: "Name" },
    { key: "ideaGroups[].isLocked", type: "boolean", label: "Locked" },
  ],

  execute(input, ctx) {
    return new BufferClient(ctx).request(IDEA_GROUPS, {
      input: { organizationId: input.organizationId },
    });
  },
};

export default ideaGroupList;
