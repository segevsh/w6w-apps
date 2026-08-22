import type { ActionDefinition } from "@w6w/types";
import { AmplitudeClient } from "../lib/client.ts";

/**
 * `GET /api/2/usersearch` — find a user by id, device or Amplitude id.
 *
 * ## Three kinds of identifier, and the response says which matched
 *
 * Amplitude holds a `user_id` you set, a `device_id` from the client, and its
 * own `amplitude_id` — an internal number that is the actual primary key and
 * the only one that never changes. `matches` comes back with the type, which
 * matters because the same string can be a user id in one project and a device
 * id in another.
 *
 * ## One person can be several Amplitude ids
 *
 * A user who signed in on two devices before being identified has two
 * `amplitude_id`s, merged only from the point identification happened. So a
 * search by `user_id` can legitimately return several, and each holds a
 * different slice of that person's history. Taking the first is how half
 * somebody's activity goes missing.
 *
 * This is a lookup, not an analytics query — it exists to get an
 * `amplitude_id` for `user-activity`.
 */
const action: ActionDefinition = {
  key: "user-search",
  type: "search",
  resource: "user",
  title: "Search for a user",
  description:
    "Find a user by id, device or Amplitude id. One person can be SEVERAL Amplitude ids if they " +
    "used more than one device before signing in — taking the first loses the rest.",
  params: [
    {
      key: "user",
      label: "Identifier",
      type: "string",
      required: true,
      default: "",
      hint: "A user id, a device id, or an Amplitude id. Amplitude works out which.",
    },
  ],
  output: [
    { key: "matches", type: "array", label: "Matching users" },
    { key: "count", type: "number", label: "How many — more than one is normal" },
    { key: "type", type: "string", label: "Which kind of identifier matched" },
    { key: "amplitudeIds", type: "array", label: "The internal ids, for `user-activity`" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const user = String(p.user ?? "").trim();
    if (!user) throw new Error("`user` is required");

    const result = await new AmplitudeClient(ctx).dashboard<{
      matches?: Array<{ amplitude_id?: number; user_id?: string }>;
      type?: string;
    }>("/api/2/usersearch", { query: { user } });

    const matches = result?.matches ?? [];
    // Several is normal: one person, several devices, merged only from the
    // point they identified.
    ctx.log("info", "searched Amplitude users", { count: matches.length, type: result?.type });

    return {
      matches,
      count: matches.length,
      type: result?.type,
      amplitudeIds: matches.map((match) => match?.amplitude_id).filter(Boolean),
    };
  },
};

export default action;
