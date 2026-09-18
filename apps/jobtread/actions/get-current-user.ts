import type { ActionDefinition } from "@w6w/types";
import { JobTreadClient } from "../lib/client.ts";

// deno-lint-ignore no-empty-interface
interface Input {}

interface MembershipNode {
  id: string;
  organization: { id: string; name: string };
}

interface CurrentGrantResponse {
  currentGrant: {
    user: {
      id: string;
      name: string;
      createdAt: string;
      memberships: { nodes: MembershipNode[]; nextPage: string | null };
    };
  } | null;
}

const getCurrentUser: ActionDefinition<Input> = {
  key: "get-current-user",
  type: "read",
  resource: "user",
  title: "Get Current User",
  description:
    "Return the user this grant belongs to, and the organizations they're a member of " +
    "(currentGrant.user, plus memberships.organization). Confirmed live (2026-09-15): `user` " +
    "exposes only id/name/createdAt/memberships — no email or phone field exists on it.",
  params: [],
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "createdAt", type: "string", label: "Created At" },
    { key: "organizations", type: "array", label: "Organizations" },
  ],

  async execute(_input, ctx) {
    const client = new JobTreadClient(ctx);
    const res = await client.query<CurrentGrantResponse>({
      currentGrant: {
        user: {
          id: {},
          name: {},
          createdAt: {},
          memberships: { nextPage: {}, nodes: { id: {}, organization: { id: {}, name: {} } } },
        },
      },
    });
    if (!res.currentGrant) {
      throw new Error("no current grant — the connection's grant key did not resolve to a user");
    }
    const { user } = res.currentGrant;
    return {
      id: user.id,
      name: user.name,
      createdAt: user.createdAt,
      organizations: user.memberships.nodes.map((m) => m.organization),
    };
  },
};

export default getCurrentUser;
