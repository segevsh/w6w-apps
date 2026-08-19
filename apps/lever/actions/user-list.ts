import type { ActionDefinition } from "@w6w/types";
import { LeverClient, query } from "../lib/client.ts";

/**
 * `GET /v1/users` — who works here, and whose name a workflow can act under.
 *
 * ## This is where `performAs` comes from
 *
 * Every write in this app takes a user id, because Lever attributes actions to
 * people. So this is the first call an integration makes, and the id it
 * chooses decides whose name appears against automated notes, stage moves and
 * archives for as long as the workflow runs.
 *
 * The right answer is usually a deliberate account — a recruiting-operations
 * user, or somebody who has agreed to it — rather than whoever happened to
 * create the API key.
 *
 * ## A deactivated user still has an id, and it still works
 *
 * `deactivatedAt` marks somebody who has left. Lever keeps their record for
 * history, and a workflow pointed at their id keeps writing notes signed by a
 * person who no longer works there. Nothing errors.
 *
 * ## Access roles decide what `performAs` can actually do
 *
 * Performing as a user does not grant their permissions to the key, but Lever
 * does reject writes a user could not make themselves. An interviewer id will
 * not archive candidates.
 */
const action: ActionDefinition = {
  key: "user-list",
  type: "search",
  resource: "user",
  title: "List users",
  description:
    "Who works here — and where every write action's `performAs` id comes from, since Lever " +
    "attributes actions to people. Flags DEACTIVATED users, whose ids still work: a workflow " +
    "pointed at one keeps signing notes as somebody who left.",
  params: [
    {
      key: "email",
      label: "Email",
      type: "string",
      default: "",
      hint: "The way to resolve a known person to their user id.",
    },
    {
      key: "includeDeactivated",
      label: "Include people who have left",
      type: "boolean",
      default: false,
    },
    { key: "limit", label: "Limit", type: "number", default: 100 },
  ],
  output: [
    { key: "users", type: "array", label: "The users" },
    { key: "count", type: "number", label: "How many, after filtering" },
    { key: "byEmail", type: "object", label: "Email to user id, for resolving `performAs`" },
    { key: "deactivatedCount", type: "number", label: "People who have left, ids still valid" },
    { key: "admins", type: "array", label: "Who can do the most" },
    { key: "roles", type: "object", label: "How many users hold each access role" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;

    const page = await new LeverClient(ctx).list<{
      id?: string;
      name?: string;
      email?: string;
      accessRole?: string;
      deactivatedAt?: number | null;
    }>("/users", {
      query: query({
        email: String(p.email ?? "").trim(),
        limit: Math.max(1, Math.min(100, Number(p.limit ?? 100))),
      }),
    });

    const all = page.data;
    const deactivated = all.filter((user) => user?.deactivatedAt);
    const users = p.includeDeactivated === true ? all : all.filter((user) => !user?.deactivatedAt);

    const byEmail: Record<string, string> = {};
    const roles: Record<string, number> = {};
    for (const user of users) {
      if (user?.email && user?.id) byEmail[user.email] = user.id;
      const role = String(user?.accessRole ?? "unknown");
      roles[role] = (roles[role] ?? 0) + 1;
    }

    if (deactivated.length && p.includeDeactivated === true) {
      ctx.log(
        "info",
        "some of these users have left. Their ids still work as `performAs`, so a workflow " +
          "pointed at one keeps writing notes signed by somebody who no longer works there",
        { deactivatedCount: deactivated.length },
      );
    }

    return {
      users: users.map((user) => ({
        id: user?.id,
        name: user?.name,
        email: user?.email,
        accessRole: user?.accessRole,
        isDeactivated: Boolean(user?.deactivatedAt),
      })),
      count: users.length,
      byEmail,
      deactivatedCount: deactivated.length,
      admins: users
        .filter((user) => /admin/i.test(String(user?.accessRole ?? "")))
        .map((user) => user?.email)
        .filter(Boolean),
      roles,
    };
  },
};

export default action;
