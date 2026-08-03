import type { ActionDefinition } from "@w6w/types";
import { compact, DiscourseClient, unset } from "../lib/client.ts";
import { userOutput } from "../lib/params.ts";

/**
 * `PUT /u/{username}.json`.
 *
 * The published request schema for this route declares exactly two fields —
 * `name` and `external_ids` — and sets `additionalProperties: false`. Discourse
 * does accept far more on it in practice (bio, title, locale, notification
 * preferences), but none of that is in the reference, so none of it is offered
 * here. Guessing at a field name that a future Discourse release renames is
 * how an action starts silently discarding half its input.
 *
 * Changing an email or a username are separate endpoints on purpose
 * (`/u/{username}/preferences/email.json`, `.../username.json`), because both
 * trigger confirmation flows. They are listed in the README as not built.
 */
interface Input {
  username: string;
  name?: string;
  externalIds?: unknown;
}

const userUpdate: ActionDefinition<Input> = {
  key: "user-update",
  type: "perform",
  resource: "user",
  title: "Update User",
  description: "Change a user's display name or external identity mapping.",
  // Writing the same values twice leaves the user identical.
  idempotent: true,
  params: [
    { key: "username", label: "Username", type: "string", required: true },
    { key: "name", label: "Full name", type: "string" },
    {
      key: "externalIds",
      label: "External IDs",
      type: "json",
      advanced: true,
      hint: 'Identity-provider mapping, e.g. { "google_oauth2": "1234" }.',
    },
  ],
  output: userOutput,

  async execute(input, ctx) {
    const body = await new DiscourseClient(ctx).request<{ user?: unknown }>(
      `/u/${encodeURIComponent(input.username)}.json`,
      {
        method: "PUT",
        body: compact({
          name: unset(input.name),
          external_ids: input.externalIds,
        }),
      },
    );
    return body?.user ?? body;
  },
};

export default userUpdate;
