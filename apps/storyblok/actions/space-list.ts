import type { ActionDefinition } from "@w6w/types";
import { assertCredential, StoryblokClient } from "../lib/client.ts";

/**
 * `GET /v1/spaces` — every space this token can reach.
 *
 * ## Which is usually more than somebody expects
 *
 * A personal access token defaults to **all spaces** its owner has. So this is
 * the action that answers "what does this credential actually reach", and the
 * answer is often a production space nobody meant to expose to a workflow.
 *
 * The rest of this app is scoped to the one space the connection names. This
 * is the exception, and it is deliberately read-only: knowing the blast radius
 * is worth an action, changing it is not.
 *
 * ## The plan decides the rate limit
 *
 * Storyblok allows 3 requests a second on Starter and 6 on everything above.
 * That is the lowest limit in this pack, and the plan is reported here so a
 * migration can be paced against the real number rather than a guess.
 */
const action: ActionDefinition = {
  key: "space-list",
  type: "search",
  resource: "space",
  title: "List spaces",
  description:
    "Every space this token reaches — which is often more than intended, since a personal " +
    "access token defaults to ALL SPACES its owner has. Reports each plan, because the plan " +
    "decides whether the Management API allows 3 or 6 requests a second.",
  params: [],
  output: [
    { key: "spaces", type: "array", label: "The spaces" },
    { key: "count", type: "number", label: "How many this token reaches" },
    { key: "names", type: "array", label: "Just the names" },
    { key: "ids", type: "array", label: "Their numeric ids" },
    { key: "connectedSpaceId", type: "string", label: "The one this connection is scoped to" },
    { key: "plans", type: "object", label: "Space to plan" },
    { key: "rateLimitPerSecond", type: "number", label: "What the connected space's plan allows" },
  ],

  async execute(_input, ctx) {
    assertCredential(ctx.connection, "management");

    const result = await new StoryblokClient(ctx).management<{
      spaces?: Array<{
        id?: number;
        name?: string;
        plan?: string;
        plan_level?: number;
        region?: string;
        domain?: string;
      }>;
    }>("/spaces");

    const spaces = result?.spaces ?? [];
    const connected = String(
      (ctx.connection as { display?: { spaceId?: unknown } } | undefined)?.display?.spaceId ?? "",
    );

    const plans: Record<string, string> = {};
    for (const space of spaces) {
      if (space?.name) plans[space.name] = String(space?.plan ?? "unknown");
    }

    const current = spaces.find((space) => String(space?.id ?? "") === connected);
    // Starter is 3 a second; everything above is 6.
    const rateLimitPerSecond = /starter/i.test(String(current?.plan ?? "")) ? 3 : 6;

    if (spaces.length > 1) {
      ctx.log(
        "info",
        "this token reaches more than one space — a personal access token defaults to every " +
          "space its owner has, and can be narrowed when it is created",
        { count: spaces.length },
      );
    }

    return {
      spaces: spaces.map((space) => ({
        id: space?.id,
        name: space?.name,
        plan: space?.plan,
        region: space?.region,
        domain: space?.domain,
      })),
      count: spaces.length,
      names: spaces.map((space) => space?.name).filter(Boolean),
      ids: spaces.map((space) => space?.id).filter(Boolean),
      connectedSpaceId: connected || undefined,
      plans,
      rateLimitPerSecond,
    };
  },
};

export default action;
