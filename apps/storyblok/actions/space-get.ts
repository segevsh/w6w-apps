import type { ActionDefinition } from "@w6w/types";
import { assertCredential, StoryblokClient } from "../lib/client.ts";

/**
 * `GET /v2/cdn/spaces/me` — the space, and the number that makes everything
 * else cheap.
 *
 * ## This is where a workflow gets its `cv`
 *
 * The `version` field on the space *is* the current cache version. Storyblok's
 * documentation is direct about the pattern: fetch it here, pass it as `cv` to
 * every later delivery call, and those calls are served from CloudFront rather
 * than the backend — **1000 requests a second instead of 50**.
 *
 * The value changes when anything in the space is published, so a workflow
 * that caches it needs a way to notice. The cheapest is a webhook on publish;
 * the simplest is calling this action at the start of each run.
 *
 * ## It is also the cheapest possible credential check
 *
 * One small request that proves the token works and the region is right. Both
 * failures return the same bare `Unauthorized`, so this is the call to make
 * first when something inexplicable is happening.
 */
const action: ActionDefinition = {
  key: "space-get",
  type: "read",
  resource: "space",
  title: "Get the space and cache version",
  description:
    "The space this token belongs to, and its `version` — which IS the `cv` cache version. " +
    "Passing that to later delivery calls moves them from 50 requests a second to 1000, and " +
    "Storyblok's own documentation makes this the first call of a run.",
  params: [],
  output: [
    { key: "space", type: "object", label: "The space" },
    { key: "id", type: "number", label: "Its numeric id" },
    { key: "name", type: "string", label: "Its name" },
    { key: "domain", type: "string", label: "The site it is published to" },
    { key: "cacheVersion", type: "number", label: "Pass this as `cv` to every delivery call" },
    { key: "languageCodes", type: "array", label: "The translations this space defines" },
  ],

  async execute(_input, ctx) {
    assertCredential(ctx.connection, "delivery");

    const result = await new StoryblokClient(ctx).delivery<{
      space?: {
        id?: number;
        name?: string;
        domain?: string;
        version?: number;
        language_codes?: string[];
      };
    }>("/spaces/me");

    const space = result.data?.space;
    if (!space) throw new Error("Storyblok returned no space for this token");

    return {
      space,
      id: space.id,
      name: space.name,
      domain: space.domain,
      // The space's `version` is the cache version, under another name.
      cacheVersion: space.version,
      languageCodes: space.language_codes ?? [],
    };
  },
};

export default action;
