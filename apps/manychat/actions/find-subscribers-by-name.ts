import type { ActionDefinition } from "@w6w/types";
import { ManychatClient, type ManychatEnvelope, type ManychatSubscriber } from "../lib/client.ts";

interface Input {
  name: string;
}

/**
 * Find subscribers by full name.
 *
 * `GET /fb/subscriber/findByName?name=…` → `{ status, data: Subscriber[] }`.
 *
 * Two constraints straight from the spec's description, both of which change how
 * you should use this:
 *
 *     "This API method search subscribers by full name.
 *      List is limited by 100 subscribers."
 *
 * and the response schema carries `"maxItems": 100`.
 *
 *   - **Full name.** Not a fuzzy prefix search, per the vendor's own wording.
 *   - **Hard cap of 100, with no pagination.** There is no `offset`, no cursor,
 *     no `total` — so a result of exactly 100 means "at least 100" and there is
 *     no published way to see the rest. This is a lookup, not an export. To
 *     enumerate an audience, use Manychat's own export or a Growth Tool, not
 *     this.
 *
 * Names are not unique in a chat audience, so this returns an array and the
 * action is `type: "search"` rather than `read`. Where an exact identity is
 * needed, `find-subscriber-by-system-field` (email or phone) is the right tool —
 * it returns a single object.
 */
const findSubscribersByName: ActionDefinition<Input> = {
  key: "find-subscribers-by-name",
  type: "search",
  resource: "subscriber",
  title: "Find Subscribers by Name",
  description:
    "Search subscribers by FULL name (GET /fb/subscriber/findByName). Capped at 100 results " +
    "with no pagination — a lookup, not an export.",
  params: [
    {
      key: "name",
      label: "Full name",
      type: "string",
      required: true,
      hint: "Manychat documents this as a full-name search, not a prefix match.",
    },
  ],
  output: [
    { key: "status", type: "string", label: "Status" },
    { key: "data", type: "array", label: "Subscribers (max 100)" },
  ],

  execute(input, ctx) {
    return new ManychatClient(ctx).get<ManychatEnvelope<ManychatSubscriber[]>>(
      "/fb/subscriber/findByName",
      { name: input.name },
    );
  },
};

export default findSubscribersByName;
