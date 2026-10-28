import type { ActionDefinition } from "@w6w/types";
import {
  bareId,
  compact,
  encodeUrn,
  LinkedInAdsClient,
  sponsoredCreativeUrn,
} from "../lib/client.ts";
import { accountIdParam, creativeIdParam, creativeIntendedStatusOptions } from "../lib/params.ts";

interface Input {
  accountId: string;
  creativeId: string;
  intendedStatus?: string;
  name?: string;
}

/**
 * `POST /rest/adAccounts/{accountId}/creatives/{creative URN}`, header
 * `X-RestLi-Method: PARTIAL_UPDATE`, body `{ patch: { $set: {...} } }`.
 *
 * LinkedIn documents exactly four mutable fields on an existing Creative:
 * `intendedStatus`, `name`, the `leadgenCallToAction` pair, and (from
 * version 202505) `content/eventAd/hidePreviewVideo`. Only `intendedStatus`
 * and `name` are exposed here — the two that apply to every creative
 * regardless of content type; the other two are narrow to lead-gen and
 * Event Ad creatives respectively and are left out rather than guessed at.
 *
 * Setting Intended status to "Pending deletion" is also how a non-DRAFT
 * creative is deleted — see the vendor's "Delete a Creative" section, which
 * documents the identical patch for anything that isn't already DRAFT, a
 * DRAFT campaign's creative, or a video creative stuck in
 * `PROCESSING_FAILED` (which alone can take a hard `DELETE`, not modeled
 * here — deleting creatives is rare enough in a workflow context that the
 * soft path covers the common case).
 *
 * A creative in review can't be moved to `PAUSED` — LinkedIn documents a
 * `400` for that specific transition, surfaced verbatim rather than
 * special-cased.
 */
const creativeUpdate: ActionDefinition<Input> = {
  key: "creative-update",
  type: "perform",
  resource: "creative",
  title: "Update Creative",
  description: "Change a Creative's intended status or name.",
  idempotent: true,
  params: [
    accountIdParam,
    creativeIdParam,
    {
      key: "intendedStatus",
      label: "New intended status",
      type: "select",
      options: creativeIntendedStatusOptions,
    },
    { key: "name", label: "New name", type: "string" },
  ],
  output: [{ key: "ok", type: "boolean", label: "Update accepted" }],

  async execute(input, ctx) {
    const set = compact({ intendedStatus: input.intendedStatus, name: input.name });
    if (Object.keys(set).length === 0) {
      throw new Error("Set at least one of: intendedStatus, name");
    }

    const client = new LinkedInAdsClient(ctx);
    await client.request(
      `/rest/adAccounts/${bareId(input.accountId)}/creatives/${
        encodeUrn(sponsoredCreativeUrn(input.creativeId))
      }`,
      { method: "POST", restliMethod: "PARTIAL_UPDATE", body: { patch: { $set: set } } },
    );
    return { ok: true };
  },
};

export default creativeUpdate;
