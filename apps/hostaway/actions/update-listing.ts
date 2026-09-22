import type { ActionDefinition } from "@w6w/types";
import { asNumber, asText, compact, HostawayClient, segment } from "../lib/client.ts";

/**
 * Partially update one listing. Wraps `PUT /v1/listings/{listingId}`.
 *
 * The docs say "A listing object should be provided in the request body", and the
 * documented Listing object carries ~90 fields. Only the subset below is exposed, each
 * one named verbatim in the documented Listing object ("Property / Required / Type /
 * Description" table and the Update-a-listing request example):
 * `name`, `internalListingName`, `externalListingName`, `description`, `houseRules`,
 * `propertyTypeId`, `city`, `country`, `price`, `cleaningFee`, `personCapacity`,
 * `minNights`, `maxNights`, `cancellationPolicy`, `contactName`, `contactEmail`.
 *
 * Two documented warnings belong on this action rather than in a runtime check:
 *
 *   - `cancellationPolicy` "accepts only flexible, moderate, firm, strict and no_refund.
 *     Any other value is rejected and the listing is not updated."
 *   - "An empty listingAmenities, listingBedTypes or listingImages array in the same
 *     request is applied before the value is checked, so those rows are deleted even
 *     though the update is rejected." This action does not send those arrays at all —
 *     which is exactly why they are not exposed here without the delete semantics being
 *     chosen deliberately.
 *
 * Unset parameters are dropped by `compact()` rather than sent as `null`, so this is a
 * true partial update.
 */
const action: ActionDefinition = {
  key: "update-listing",
  type: "perform",
  resource: "listing",
  title: "Update a listing",
  description: "Partially update one listing's descriptive, pricing and policy fields.",
  idempotent: true,
  params: [
    { key: "listingId", label: "Listing ID", type: "number", required: true },
    { key: "name", label: "Name", type: "string" },
    { key: "internalListingName", label: "Internal name", type: "string" },
    { key: "externalListingName", label: "External name", type: "string" },
    { key: "description", label: "Description", type: "text" },
    { key: "houseRules", label: "House rules", type: "text" },
    { key: "propertyTypeId", label: "Property type ID", type: "number" },
    { key: "city", label: "City", type: "string" },
    { key: "country", label: "Country", type: "string" },
    { key: "price", label: "Base price", type: "number" },
    { key: "cleaningFee", label: "Cleaning fee", type: "number" },
    { key: "personCapacity", label: "Person capacity", type: "number" },
    { key: "minNights", label: "Minimum nights", type: "number" },
    { key: "maxNights", label: "Maximum nights", type: "number" },
    {
      key: "cancellationPolicy",
      label: "Cancellation policy",
      type: "select",
      options: [
        { value: "", label: "Leave unchanged" },
        { value: "flexible", label: "Flexible" },
        { value: "moderate", label: "Moderate" },
        { value: "firm", label: "Firm" },
        { value: "strict", label: "Strict" },
        { value: "no_refund", label: "No refund" },
      ],
      hint: "Any other value is rejected and the listing is not updated.",
    },
    { key: "contactName", label: "Contact name", type: "string" },
    { key: "contactEmail", label: "Contact email", type: "string" },
  ],
  output: [
    { key: "id", type: "number", label: "Listing ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "price", type: "number", label: "Base price" },
    { key: "cancellationPolicy", type: "string", label: "Cancellation policy" },
    { key: "updatedOn", type: "string", label: "Last updated" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const listingId = asNumber(p.listingId);
    if (listingId === undefined) throw new Error("`listingId` is required");

    const body = compact({
      name: asText(p.name),
      internalListingName: asText(p.internalListingName),
      externalListingName: asText(p.externalListingName),
      description: asText(p.description),
      houseRules: asText(p.houseRules),
      propertyTypeId: asNumber(p.propertyTypeId),
      city: asText(p.city),
      country: asText(p.country),
      price: asNumber(p.price),
      cleaningFee: asNumber(p.cleaningFee),
      personCapacity: asNumber(p.personCapacity),
      minNights: asNumber(p.minNights),
      maxNights: asNumber(p.maxNights),
      cancellationPolicy: asText(p.cancellationPolicy),
      contactName: asText(p.contactName),
      contactEmail: asText(p.contactEmail),
    });
    if (Object.keys(body).length === 0) {
      throw new Error("Provide at least one field to update");
    }

    return await new HostawayClient(ctx).request(`/listings/${segment(listingId)}`, {
      method: "PUT",
      body,
    });
  },
};

export default action;
