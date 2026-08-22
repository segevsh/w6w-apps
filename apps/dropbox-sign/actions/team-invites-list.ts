import type { ActionDefinition } from "@w6w/types";
import { compact, DropboxSignClient } from "../lib/client.ts";

/**
 * `GET /team/invites` — verified against the official OpenAPI document
 * (`teamInvites`).
 *
 * Returns invitations that have not been accepted yet — the gap between "we
 * added them" and "they are a member", which `team-members-list` does not show.
 * This endpoint pages nothing: it answers with the whole list.
 */
const action: ActionDefinition = {
  key: "team-invites-list",
  type: "read",
  resource: "team",
  title: "List team invites",
  description: "List outstanding invitations to join the team.",
  params: [
    {
      key: "emailAddress",
      label: "Email Address",
      type: "string",
      default: "",
      hint: "Narrow to one invitee.",
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;

    ctx.log("info", "listing Dropbox Sign team invites", {});

    const res = await new DropboxSignClient(ctx).request<
      { team_invites?: unknown[] }
    >("/team/invites", {
      query: compact({ email_address: p.emailAddress }) as Record<string, string>,
    });
    return res?.team_invites ?? [];
  },
};

export default action;
