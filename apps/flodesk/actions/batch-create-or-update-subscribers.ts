import type { ActionDefinition } from "@w6w/types";
import { FlodeskClient } from "../lib/client.ts";

interface Input {
  subscribers: unknown[];
}

/**
 * `POST /v1/subscribers/batch` — up to 50 subscribers per call, each item the
 * same shape as the single upsert.
 *
 * **This endpoint is metered separately**: 20 requests/minute against the
 * default 100, because each call does up to 50 upserts (so ~1,000
 * subscribers/minute). It is the only endpoint in the document that declares a
 * `429` response of its own.
 *
 * **It is partially-successful by design.** The response is
 * `{ successes: [...], failures: [...] }`, where each failure carries the
 * zero-based `index` of the offending item plus a `code` and `message`. A 200
 * here does NOT mean every subscriber was written — read `failures`. That is
 * why both arrays are declared as separate outputs rather than folded into one.
 *
 * `idempotent: true` for the same reason as the single upsert: every item is an
 * upsert keyed on email or id, so a replayed batch converges.
 */
const batchCreateOrUpdateSubscribers: ActionDefinition<Input> = {
  key: "batch-create-or-update-subscribers",
  type: "perform",
  resource: "subscriber",
  title: "Batch Create or Update Subscribers",
  description:
    "Upsert up to 50 subscribers in one call. Partially successful by design — inspect `failures` as well as `successes`. Rate-limited to 20 requests/minute, separately from the rest of the API.",
  idempotent: true,
  params: [
    {
      key: "subscribers",
      label: "Subscribers",
      type: "json",
      required: true,
      hint:
        'JSON array of subscriber objects, maximum 50. Each item takes Flodesk\'s own snake_case keys: `email` or `id` (one is required), `first_name`, `last_name`, `custom_fields`, `segment_ids`, `double_optin`, `optin_ip`, `optin_timestamp`. E.g. `[{"email":"a@b.com","first_name":"Ada"}]`.',
    },
  ],
  output: [
    { key: "successes", type: "array", label: "Subscribers written" },
    {
      key: "failures",
      type: "array",
      label: "Per-item errors, each with `index`, `code`, `message`",
    },
  ],

  execute(input, ctx) {
    if (!Array.isArray(input.subscribers)) {
      throw new Error("`subscribers` must be a JSON array");
    }
    if (input.subscribers.length === 0) {
      throw new Error("`subscribers` must contain at least one subscriber");
    }
    // Flodesk: "List of subscribers to create or update. Maximum 50 items."
    // Caught here rather than spending a call from the 20/minute budget on a 400.
    if (input.subscribers.length > 50) {
      throw new Error(
        `Flodesk accepts at most 50 subscribers per batch; got ${input.subscribers.length}`,
      );
    }

    return new FlodeskClient(ctx).request("/subscribers/batch", {
      method: "POST",
      body: { subscribers: input.subscribers },
    });
  },
};

export default batchCreateOrUpdateSubscribers;
