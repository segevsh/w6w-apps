import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, SharetribeClient } from "../lib/client.ts";
import {
  authorIdParam,
  geolocationParam,
  listingCreateStateOptions,
  metadataParam,
  priceParam,
  privateDataParam,
  publicDataParam,
  resourceOutput,
} from "../lib/params.ts";

interface Input {
  title: string;
  authorId: string;
  state: string;
  description?: string;
  geolocation?: unknown;
  price?: unknown;
  publicData?: unknown;
  privateData?: unknown;
  metadata?: unknown;
  images?: string[] | string;
}

/**
 * `POST /v1/integration_api/listings/create` — create a listing for a given author.
 *
 * Rate-limited to 100 calls/minute across the whole marketplace environment, on top of any
 * other applicable limit — the vendor's own documented ceiling, worth knowing before looping
 * this over a bulk import.
 *
 * `availabilityPlan` and `protectedFileAttachments` are not exposed: the former is a fairly
 * large nested object whose shape is under-specified on this reference page (it links out to a
 * separate "listing availability plan" doc this app could not fetch), and the latter needs a
 * `fileId` obtained from the separate file-upload endpoints this app does not cover. Both are
 * reachable by round-tripping a plain `json` body through a Function step if needed.
 */
const listingCreate: ActionDefinition<Input> = {
  key: "listing-create",
  type: "perform",
  resource: "listing",
  title: "Create Listing",
  description: "Create a listing belonging to the given marketplace user.",
  idempotent: false,
  params: [
    { key: "title", label: "Title", type: "string", required: true, hint: "1–1000 characters." },
    authorIdParam,
    {
      key: "state",
      label: "State",
      type: "select",
      required: true,
      options: listingCreateStateOptions,
    },
    {
      key: "description",
      label: "Description",
      type: "text",
      hint: "1–5000 characters.",
    },
    geolocationParam,
    priceParam,
    publicDataParam,
    privateDataParam,
    metadataParam,
    {
      key: "images",
      label: "Image IDs",
      type: "string",
      hint: "Comma-separated image UUIDs, from /images/upload. Sets the listing's images to " +
        "exactly this list.",
    },
  ],
  output: resourceOutput,

  execute(input, ctx) {
    const images = typeof input.images === "string"
      ? input.images.split(",").map((s) => s.trim()).filter(Boolean)
      : input.images;
    return new SharetribeClient(ctx).command(
      "/listings/create",
      compact({
        title: input.title,
        authorId: input.authorId,
        state: input.state,
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

export default listingCreate;
