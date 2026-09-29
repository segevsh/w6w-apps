import { asOptionalJson, compact, SharetribeClient } from "../lib/client.ts";
import type { ActionDefinition } from "@w6w/types";
import {
  geolocationParam,
  idParam,
  metadataParam,
  priceParam,
  privateDataParam,
  publicDataParam,
  resourceOutput,
} from "../lib/params.ts";

interface Input {
  id: string;
  title?: string;
  description?: string;
  geolocation?: unknown;
  price?: unknown;
  publicData?: unknown;
  privateData?: unknown;
  metadata?: unknown;
  images?: string[] | string;
}

/**
 * `POST /v1/integration_api/listings/update` — update listing details. Cannot change state; use
 * `listing-close`/`listing-open`/`listing-approve` for that.
 *
 * `publicData`/`privateData`/`metadata` are shallow-merged with the existing object by
 * Sharetribe itself — a top-level key set to `null` removes it, and everything else is left
 * alone. `geolocation`/`price` are wholesale-replaced (pass `null` to clear either one).
 * `images`, when given, replaces the full image list.
 */
const listingUpdate: ActionDefinition<Input> = {
  key: "listing-update",
  type: "perform",
  resource: "listing",
  title: "Update Listing",
  description: "Update a listing's title, description, location, price or extended data.",
  idempotent: true,
  params: [
    idParam,
    { key: "title", label: "Title", type: "string", hint: "1–1000 characters." },
    { key: "description", label: "Description", type: "text", hint: "1–5000 characters." },
    geolocationParam,
    priceParam,
    publicDataParam,
    privateDataParam,
    metadataParam,
    {
      key: "images",
      label: "Image IDs",
      type: "string",
      hint: "Comma-separated image UUIDs. Replaces the listing's full image list, in order.",
    },
  ],
  output: resourceOutput,

  execute(input, ctx) {
    const images = typeof input.images === "string"
      ? input.images.split(",").map((s) => s.trim()).filter(Boolean)
      : input.images;
    return new SharetribeClient(ctx).command(
      "/listings/update",
      compact({
        id: input.id,
        title: input.title,
        description: input.description,
        geolocation: asOptionalJson(input.geolocation, "geolocation"),
        price: asOptionalJson(input.price, "price"),
        publicData: asOptionalJson(input.publicData, "publicData"),
        privateData: asOptionalJson(input.privateData, "privateData"),
        metadata: asOptionalJson(input.metadata, "metadata"),
        images: images && images.length > 0 ? images : undefined,
      }),
    );
  },
};

export default listingUpdate;
