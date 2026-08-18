import type { ActionDefinition } from "@w6w/types";
import { DeepgramClient } from "../lib/client.ts";

/**
 * `GET /v1/projects/{id}/members/{member_id}/scopes` — what one person may do.
 *
 * `member-list` says who is in the project; this says what they can do in it,
 * which is the question an access review is actually asking. The scopes are the
 * same vocabulary keys use — `owner`, `admin`, `member` — so a member with
 * `owner` can mint an owner key, and the two lists have to be read together to
 * mean anything.
 */
const action: ActionDefinition = {
  key: "member-scope-list",
  type: "read",
  resource: "member",
  title: "List a member's scopes",
  description:
    "What one person may do in this project. A member with `owner` can mint an owner key, so " +
    "this and `key-list` only mean something read together.",
  params: [
    {
      key: "memberId",
      label: "Member ID",
      type: "string",
      required: true,
      default: "",
      hint: "From `member-list`.",
    },
  ],
  output: [
    { key: "scopes", type: "array", label: "Granted scopes" },
    { key: "privileged", type: "boolean", label: "Whether any scope is owner or admin" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const memberId = String(p.memberId ?? "").trim();
    if (!memberId) throw new Error("`memberId` is required");

    const client = new DeepgramClient(ctx);
    const body = await client.request<{ scopes?: string[] }>(
      `/v1/projects/${encodeURIComponent(client.projectId)}/members/${
        encodeURIComponent(memberId)
      }/scopes`,
    );
    const scopes = body?.scopes ?? [];
    return { scopes, privileged: scopes.some((s) => /owner|admin/i.test(s)) };
  },
};

export default action;
