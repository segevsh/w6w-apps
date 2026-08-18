import type { ActionDefinition } from "@w6w/types";
import { DeepgramClient } from "../lib/client.ts";

/**
 * `GET /v1/projects/{id}/invites` — who has been invited and not yet joined.
 *
 * The half of the access picture `member-list` cannot see. An outstanding
 * invitation is a pending grant: whoever controls that mailbox can join the
 * project, and Deepgram does not expire invitations on its own.
 *
 * An access review that reads only members therefore misses the invitation sent
 * to a contractor whose engagement ended in March.
 */
const action: ActionDefinition = {
  key: "invite-list",
  type: "read",
  resource: "invite",
  title: "List invitations",
  description:
    "Outstanding invitations — pending grants that `member-list` cannot see, and that Deepgram " +
    "does not expire on its own.",
  params: [],
  output: [
    { key: "invites", type: "array", label: "Outstanding invitations" },
    { key: "count", type: "number", label: "Invitations outstanding" },
  ],

  async execute(_input, ctx) {
    const client = new DeepgramClient(ctx);
    const body = await client.request<{ invites?: unknown[] }>(
      `/v1/projects/${encodeURIComponent(client.projectId)}/invites`,
    );
    const invites = body?.invites ?? [];
    ctx.log("info", "read Deepgram project invitations", { count: invites.length });
    return { invites, count: invites.length };
  },
};

export default action;
