import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `POST /api/v3/inbox/archive_all`
 *
 * Archive every inbox thread in a workspace.
 */
interface Input {
  workspaceId: number;
  olderThanTs?: number;
}

const inboxArchiveAll: ActionDefinition<Input> = {
  key: "inbox-archive-all",
  type: "perform",
  resource: "inbox",
  title: "Archive All Inbox Threads",
  description: "Archive every inbox thread in a workspace.",
  idempotent: true,
  params: [
    {
      key: "workspaceId",
      label: "Workspace ID",
      type: "number",
      required: true,
      hint: "Twist workspace (team) id.",
    },
    {
      key: "olderThanTs",
      label: "Older than (Unix time)",
      type: "number",
      hint: "Only archive threads at or older than this time.",
    },
  ],
  output: [
    {
      key: "result",
      type: "string",
      label: "Twist's response when it is not an object (normally empty)",
    },
  ],

  execute(input, ctx) {
    return twist(ctx, {
      method: "POST",
      path: "/inbox/archive_all",
      params: { "workspace_id": input.workspaceId, "older_than_ts": input.olderThanTs },
    });
  },
};

export default inboxArchiveAll;
