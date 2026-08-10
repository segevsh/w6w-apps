import type { ActionDefinition } from "@w6w/types";
import { AttioClient, PAGE_OUTPUT } from "../lib/client.ts";

/**
 * `GET /v2/workspace_members` — the people in the workspace.
 *
 * "Lists all workspace members in the workspace." Needs `user_management:read`.
 *
 * ## Members are not records, and the distinction is not cosmetic
 *
 * A **workspace member** is a human with a seat in this Attio workspace. A
 * **person record** is a contact stored in the CRM. They live in different parts
 * of the API and are never the same object, even for the same human.
 *
 * Everywhere this app writes an owner, an assignee or a comment author, it wants
 * a workspace member — actor-reference attributes accept only
 * `"workspace-member"` actors ("Currently, the only type of actor that can be
 * explicitly set in our API is `workspace-member`"), and tasks state the same
 * rule. So this endpoint is the id source for:
 *
 *   - a deal's `owner` and any other actor-reference attribute,
 *   - `assignees` on Create Task and Update Task,
 *   - the `assignee` filter on List Tasks,
 *   - the `request_as` narrowing on Search Records.
 *
 * Each member carries a composite `id` with `workspace_member_id`, plus
 * `first_name`, `last_name`, `email_address`, `avatar_url`, `access_level` and
 * `created_at`. Both the id and the email work wherever a member is named,
 * which is why so many params here accept either.
 *
 * The endpoint takes no parameters.
 */
const listWorkspaceMembers: ActionDefinition<Record<string, never>> = {
  key: "list-workspace-members",
  type: "read",
  resource: "workspace-member",
  title: "List Workspace Members",
  description:
    "Everyone with a seat in the Attio workspace, with their member id, email and access level. " +
    "The id source for deal owners, task assignees and any other actor-reference attribute — " +
    "these are seats, not person records.",
  params: [],
  output: PAGE_OUTPUT,

  async execute(_input, ctx) {
    const { records } = await new AttioClient(ctx).list("/workspace_members");
    return { records };
  },
};

export default listWorkspaceMembers;
