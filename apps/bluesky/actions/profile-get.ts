import type { ActionDefinition } from "@w6w/types";
import { BlueskyClient, csv } from "../lib/client.ts";

/**
 * `app.bsky.actor.getProfiles` — profiles for up to 25 accounts.
 *
 * ## `viewer` is the half that answers most questions
 *
 * Alongside the public fields, each profile carries a `viewer` block describing
 * the relationship between *this connection* and that account: `following` and
 * `followedBy` (each an AT-URI when present, absent otherwise), `blocking`,
 * `blockedBy`, `muted`. Almost every real question — do we follow them, did
 * they block us — is answered there rather than by a separate call.
 *
 * Note the shape: `following` is a **URI or absent**, never a boolean. `if
 * (profile.viewer.following)` is right; comparing it to `true` is always false.
 *
 * ## The handle can change; the DID cannot
 *
 * Both come back. Anything stored beyond the run should store the DID.
 */
const action: ActionDefinition = {
  key: "profile-get",
  type: "read",
  resource: "profile",
  title: "Get profiles",
  description:
    "Profiles for up to 25 accounts, each with the `viewer` block that says whether this " +
    "connection follows, is followed by, or is blocked by them.",
  params: [
    {
      key: "actors",
      label: "Accounts",
      type: "string",
      required: true,
      default: "",
      hint: "Comma-separated handles or DIDs, up to 25.",
    },
  ],
  output: [
    { key: "profiles", type: "array", label: "The profiles that exist" },
    { key: "profile", type: "object", label: "The first one, for the single-account case" },
    { key: "count", type: "number", label: "How many came back" },
    { key: "missing", type: "array", label: "Accounts that did not resolve" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const actors = csv(p.actors)?.map((a) => a.replace(/^@/, ""));
    if (!actors || actors.length === 0) throw new Error("`actors` is required");
    if (actors.length > 25) {
      throw new Error(`getProfiles takes at most 25 accounts at a time — got ${actors.length}`);
    }

    const result = await new BlueskyClient(ctx).call<{
      profiles?: Array<{ did?: string; handle?: string }>;
    }>("app.bsky.actor.getProfiles", { query: { actors: actors.join(",") } });

    const profiles = result?.profiles ?? [];
    // Match on either identifier, since the caller may have given us either.
    const seen = new Set<string>();
    for (const profile of profiles) {
      if (profile?.did) seen.add(profile.did.toLowerCase());
      if (profile?.handle) seen.add(profile.handle.toLowerCase());
    }
    const missing = actors.filter((actor) => !seen.has(actor.toLowerCase()));

    ctx.log("info", "read Bluesky profiles", { asked: actors.length, count: profiles.length });
    return { profiles, profile: profiles[0], count: profiles.length, missing };
  },
};

export default action;
