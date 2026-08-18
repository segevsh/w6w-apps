import type { ActionDefinition } from "@w6w/types";
import { HuggingFaceClient } from "../lib/client.ts";

/**
 * `GET /api/whoami-v2` — who this token is and what it can do.
 *
 * ## The answer to "why is that repository 403ing"
 *
 * A fine-grained token names the repositories it may touch, and one it omits
 * returns 403 on that repository alone while working everywhere else. That
 * reads as an intermittent fault, and this is the fastest way to see it is not.
 *
 * `auth.accessToken.role` is `read` or `write` for a classic token;
 * `auth.accessToken.fineGrained` carries the per-scope permissions for the
 * newer kind.
 *
 * ## Organisations decide what "your" repositories means
 *
 * A token can create a repository under the user or under any organisation the
 * user belongs to, and `repo-create` needs to be told which. The list here is
 * where those names come from.
 */
const action: ActionDefinition = {
  key: "whoami",
  type: "read",
  resource: "account",
  title: "Get the current identity",
  description:
    "Who this token is and what it may do. A fine-grained token that omits a repository returns " +
    "403 on it alone, which reads as an intermittent fault — this says otherwise.",
  params: [],
  output: [
    { key: "name", type: "string", label: "The account" },
    { key: "type", type: "string", label: "user or org" },
    { key: "role", type: "string", label: "read or write, for a classic token" },
    { key: "fineGrained", type: "object", label: "Per-scope permissions, for the newer kind" },
    { key: "orgs", type: "array", label: "Organisations this token can act in" },
    { key: "identity", type: "object", label: "The full response" },
  ],

  async execute(_input, ctx) {
    const identity = await new HuggingFaceClient(ctx).request<{
      name?: string;
      type?: string;
      orgs?: Array<{ name?: string }>;
      auth?: { accessToken?: { role?: string; fineGrained?: unknown } };
    }>("/api/whoami-v2");

    return {
      name: identity?.name,
      type: identity?.type,
      role: identity?.auth?.accessToken?.role,
      fineGrained: identity?.auth?.accessToken?.fineGrained,
      orgs: (identity?.orgs ?? []).map((org) => org?.name).filter(Boolean),
      identity,
    };
  },
};

export default action;
