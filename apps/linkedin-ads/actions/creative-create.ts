import type { ActionDefinition } from "@w6w/types";
import { bareId, compact, LinkedInAdsClient, sponsoredCampaignUrn } from "../lib/client.ts";
import { accountIdParam, campaignIdParam, creativeIntendedStatusOptions } from "../lib/params.ts";

interface Input {
  accountId: string;
  campaignId: string;
  contentReference: string;
  intendedStatus?: string;
  name?: string;
}

/**
 * `POST /rest/adAccounts/{accountId}/creatives` — creates a Creative that
 * **references existing content** (`content: { reference: <URN> }`): an
 * already-published post/share (`urn:li:share:{id}` or
 * `urn:li:ugcPost:{id}`) or InMail content (`urn:li:adInMailContent:{id}`).
 *
 * Deliberately the ONLY create shape this action supports. LinkedIn's
 * Creatives API also accepts `inlineContent` (author a new UGC post inline,
 * via `?action=createInline`) and several dynamic-ad / Event Ad content
 * shapes, each with its own nested schema — modeling all of those as Params
 * would either re-implement the Posts API's own schema (already covered by
 * the sibling `linkedin` app's `create-post`, whose returned `id` is exactly
 * what belongs in Content reference URN here) or guess at fields this app
 * can't verify end-to-end. Left out rather than shipped half-right; see the
 * README.
 *
 * `campaign`'s ad format must already be set to (or first-established by)
 * a creative type matching this content, per the vendor's own campaign
 * limitations note.
 *
 * The new creative's URN comes back in `x-restli-id`, surfaced as `{ id }`.
 * Not `idempotent`: no create-time dedupe key is documented.
 */
const creativeCreate: ActionDefinition<Input> = {
  key: "creative-create",
  type: "perform",
  resource: "creative",
  title: "Create Creative (from existing content)",
  description: "Create a Creative that sponsors an already-published post/share or InMail " +
    "content. Does not author new content — reference an existing urn:li:share:{id}, " +
    "urn:li:ugcPost:{id} or urn:li:adInMailContent:{id}.",
  idempotent: false,
  params: [
    accountIdParam,
    campaignIdParam,
    {
      key: "contentReference",
      label: "Content reference URN",
      type: "string",
      required: true,
      placeholder: "urn:li:ugcPost:6778045555198214144",
      hint: "An already-published urn:li:share:{id}, urn:li:ugcPost:{id} or " +
        "urn:li:adInMailContent:{id}.",
    },
    {
      key: "intendedStatus",
      label: "Intended status",
      type: "select",
      default: "DRAFT",
      options: creativeIntendedStatusOptions.filter((o) =>
        o.value === "ACTIVE" || o.value === "PAUSED" || o.value === "DRAFT"
      ),
    },
    { key: "name", label: "Name", type: "string", advanced: true, hint: "Advertiser-set label." },
  ],
  output: [{ key: "id", type: "string", label: "Creative URN" }],

  async execute(input, ctx) {
    const client = new LinkedInAdsClient(ctx);
    const result = await client.request<{ id: string }>(
      `/rest/adAccounts/${bareId(input.accountId)}/creatives`,
      {
        method: "POST",
        body: {
          campaign: sponsoredCampaignUrn(input.campaignId),
          content: { reference: input.contentReference },
          intendedStatus: input.intendedStatus || "DRAFT",
          ...compact({ name: input.name }),
        },
      },
    );
    return { id: result.id };
  },
};

export default creativeCreate;
