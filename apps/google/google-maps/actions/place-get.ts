import type { ActionDefinition } from "@w6w/types";
import { HOSTS, MapsClient, query } from "../lib/client.ts";
import { billingTier, DEFAULT_PLACE_DETAIL_FIELDS } from "../lib/fields.ts";
import { fieldMaskParam, LANGUAGE_PARAM, REGION_PARAM } from "../lib/params.ts";

/**
 * `GET places.googleapis.com/v1/places/{place_id}` — everything about one
 * place.
 *
 * ## A place id is durable, and it is not permanent
 *
 * Google's own guidance is to store the place id and re-fetch, because
 * everything else about a place changes. The id itself is stable for the
 * overwhelming majority of places — but a place that merges with another, or is
 * re-created after a closure, gets a new one, and the old id then **404s or
 * redirects**. A workflow holding ids for a year should expect a small number
 * of them to stop resolving, and treat that as "re-find this place", not as an
 * outage.
 *
 * ## The mask has no `places.` prefix here
 *
 * Search responses wrap results in `places[]`, so their masks read
 * `places.displayName`. A details response **is** the place, so the mask reads
 * `displayName`. Copying a working mask from a search action into this one
 * fails, and the message is about an unknown field rather than about the
 * prefix.
 *
 * The same SKU tiers apply — see `lib/fields.ts`.
 */
const action: ActionDefinition = {
  key: "place-get",
  type: "read",
  resource: "place",
  title: "Get a place",
  description:
    "Details for one place id. The field mask here takes NO `places.` prefix — a mask copied " +
    "from a search action fails with a message about an unknown field.",
  params: [
    {
      key: "placeId",
      label: "Place ID",
      type: "string",
      required: true,
      default: "",
      hint: "From a search action, or from `geocode`. Either `ChIJ…` or `places/ChIJ…`.",
    },
    fieldMaskParam(
      DEFAULT_PLACE_DETAIL_FIELDS,
      "No `places.` prefix on this endpoint. Adding `rating`, `websiteUri` or " +
        "`regularOpeningHours` moves the call to the Enterprise tier; `reviews` and the " +
        "`serves*` fields to Enterprise + Atmosphere.",
    ),
    {
      key: "sessionToken",
      label: "Session Token",
      type: "string",
      default: "",
      advanced: true,
      hint: "If this lookup completes an autocomplete session, pass the SAME token used for the " +
        "predictions — that is what makes the session bill as one unit instead of per keystroke.",
    },
    LANGUAGE_PARAM,
    REGION_PARAM,
  ],
  output: [
    { key: "place", type: "object", label: "The place, with the fields asked for" },
    { key: "id", type: "string", label: "Its place id" },
    { key: "displayName", type: "string", label: "Its name, if the mask asked for one" },
    { key: "billingTier", type: "string", label: "The SKU this call billed at" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const raw = String(p.placeId ?? "").trim();
    if (!raw) throw new Error("`placeId` is required");
    // Accept both the bare id and the resource name Google returns.
    const name = raw.startsWith("places/") ? raw : `places/${raw}`;
    const fieldMask = String(p.fieldMask ?? DEFAULT_PLACE_DETAIL_FIELDS).trim() ||
      DEFAULT_PLACE_DETAIL_FIELDS;

    if (/^places\./.test(fieldMask.split(",")[0].trim())) {
      throw new Error(
        "this endpoint's field mask takes no `places.` prefix — that form is for the search " +
          "actions, where results are wrapped. Use `displayName`, not `places.displayName`",
      );
    }

    const place = await new MapsClient(ctx).rpc<
      { id?: string; displayName?: { text?: string } | string }
    >(HOSTS.places, `/v1/${name}`, {
      fieldMask,
      query: query({
        languageCode: p.languageCode,
        regionCode: p.regionCode,
        sessionToken: p.sessionToken,
      }),
    });

    const tier = billingTier(fieldMask);
    ctx.log("info", "read a place", { billingTier: tier });

    const displayName = typeof place?.displayName === "string"
      ? place.displayName
      : place?.displayName?.text;

    return { place, id: place?.id ?? raw, displayName, billingTier: tier };
  },
};

export default action;
