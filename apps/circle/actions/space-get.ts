import type { ActionDefinition } from "@w6w/types";
import { CircleClient } from "../lib/client.ts";
import { spaceOutput } from "../lib/params.ts";

/**
 * `GET /spaces/{id}` — one space, in full.
 *
 * Worth a round trip over reading the same record out of `space-list` when a
 * workflow needs the settings rather than the identity: the single-space
 * response carries the full `space` schema — `space_type`, `topics`,
 * `space_group`, the notification defaults, and the lock/visibility flags —
 * where a listing is the same shape but a page at a time.
 *
 * The id is an integer. Circle's spaces do have slugs, and they appear in every
 * space URL, but no v2 route accepts one: `space_id` is typed `integer` on all
 * eleven parameters that take it.
 */
interface Input {
  spaceId: number;
}

const spaceGet: ActionDefinition<Input> = {
  key: "space-get",
  type: "read",
  resource: "space",
  title: "Get Space",
  description: "Fetch one space by numeric id, with its full settings.",
  params: [
    {
      key: "spaceId",
      label: "Space ID",
      type: "number",
      required: true,
      hint: "Numeric id, not a slug — no v2 route accepts a slug. `space-list` returns them.",
      validation: { integer: true },
    },
  ],
  output: spaceOutput,

  execute(input, ctx) {
    return new CircleClient(ctx).request(`/spaces/${encodeURIComponent(String(input.spaceId))}`);
  },
};

export default spaceGet;
