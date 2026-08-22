import type { ActionDefinition } from "@w6w/types";
import { compact, csv, MiroClient } from "../lib/client.ts";
import { BOARD_PARAM } from "../lib/params.ts";

/**
 * `POST /v2/boards/{board_id}/members` — verified against Miro's OpenAPI
 * document (`share-board`; body requires `emails`).
 *
 * This **sends invitations**. It is not a membership lookup and not idempotent
 * in the sense that matters: re-running it emails the same people again.
 */
const action: ActionDefinition = {
  key: "board-share",
  type: "perform",
  resource: "member",
  title: "Share a board",
  description: "Invite people to a board by email.",
  // Re-running re-invites.
  idempotent: false,
  params: [
    BOARD_PARAM,
    {
      key: "emails",
      label: "Emails",
      type: "string",
      required: true,
      default: "",
      hint: "Comma-separated email addresses.",
    },
    {
      key: "role",
      label: "Role",
      type: "select",
      default: "commenter",
      options: [
        { value: "viewer", label: "Viewer" },
        { value: "commenter", label: "Commenter" },
        { value: "editor", label: "Editor" },
        { value: "coowner", label: "Co-owner" },
        { value: "owner", label: "Owner" },
        { value: "guest", label: "Guest" },
      ],
    },
    {
      key: "message",
      label: "Message",
      type: "text",
      default: "",
      hint: "Included in the invite.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Board ID" },
    { key: "successfulEmails", type: "array", label: "Invited" },
    { key: "failedEmails", type: "array", label: "Failed" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const boardId = String(p.boardId ?? "").trim();
    const emails = csv(p.emails);
    if (!boardId) throw new Error("`boardId` is required");
    if (!emails) throw new Error("`emails` is required — at least one address");

    const body = compact({ emails, role: p.role, message: p.message });

    ctx.log("info", "sharing Miro board", { boardId, count: emails.length });

    return await new MiroClient(ctx).request(
      `/v2/boards/${encodeURIComponent(boardId)}/members`,
      { method: "POST", body },
    );
  },
};

export default action;
