import type { ActionDefinition } from "@w6w/types";
import { DeepgramClient } from "../lib/client.ts";

/**
 * `GET /v1/projects/{id}/members` — who has access to the project.
 *
 * Paired with `key-list`, this is the whole access picture: people and machines
 * reaching the same project. It is the list an offboarding check reads, and the
 * one that answers "who could have created that key".
 *
 * Members' scopes are per project rather than global, so a person can be an
 * owner of one project and a member of another. This returns the roster;
 * `member-scope-list` reads one person's scopes.
 */
const action: ActionDefinition = {
  key: "member-list",
  type: "read",
  resource: "member",
  title: "List members",
  description:
    "Who has access to this project. With `key-list` it is the whole access picture — the people " +
    "and the machines reaching the same data.",
  params: [],
  output: [
    { key: "members", type: "array", label: "Members" },
    { key: "count", type: "number", label: "Members returned" },
  ],

  async execute(_input, ctx) {
    const client = new DeepgramClient(ctx);
    const body = await client.request<{ members?: unknown[] }>(
      `/v1/projects/${encodeURIComponent(client.projectId)}/members`,
    );
    const members = body?.members ?? [];
    ctx.log("info", "read Deepgram project members", { count: members.length });
    return { members, count: members.length };
  },
};

export default action;
