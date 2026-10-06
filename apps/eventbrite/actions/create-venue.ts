import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";
import { deepMerge } from "../lib/merge.ts";

interface Input {
  organizationId: string;
  name: string;
  organizerId?: string;
  googlePlaceId?: string;
  ageRestriction?: string;
  capacity?: number;
  address1?: string;
  address2?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
  latitude?: string;
  longitude?: string;
  extra?: Record<string, unknown>;
}

const AGE_RESTRICTIONS = [
  "AGE_RESTRICTION_ALL_AGES",
  "AGE_RESTRICTION_MIN_TWELVE",
  "AGE_RESTRICTION_MIN_THIRTEEN",
  "AGE_RESTRICTION_MIN_FOURTEEN",
  "AGE_RESTRICTION_MIN_FIFTEEN",
  "AGE_RESTRICTION_MIN_SIXTEEN",
  "AGE_RESTRICTION_MIN_SEVENTEEN",
  "AGE_RESTRICTION_MIN_EIGHTEEN",
  "AGE_RESTRICTION_MIN_NINETEEN",
  "AGE_RESTRICTION_MIN_TWENTY_ONE",
  "AGE_RESTRICTION_UNDER_TWENTY_ONE_WITH_GUARDIAN",
  "AGE_RESTRICTION_UNDER_EIGHTEEN_WITH_GUARDIAN",
];

const createVenue: ActionDefinition<Input> = {
  key: "create-venue",
  type: "perform",
  idempotent: false,
  resource: "venue",
  title: "Create Venue",
  description: "Creates a new venue under the organization on Eventbrite.",
  params: [
    { key: "organizationId", label: "Organization ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "organizerId",
      label: "Organizer ID",
      type: "string",
      hint: "Leave empty to use the default organizer.",
    },
    { key: "googlePlaceId", label: "Google place ID", type: "string" },
    {
      key: "ageRestriction",
      label: "Age restriction",
      type: "select",
      options: AGE_RESTRICTIONS.map((v) => ({ value: v, label: v })),
    },
    { key: "capacity", label: "Capacity", type: "number" },
    { key: "address1", label: "Address line 1", type: "string" },
    { key: "address2", label: "Address line 2", type: "string" },
    { key: "city", label: "City", type: "string" },
    { key: "region", label: "Region", type: "string", hint: "ISO 3166-2 region code." },
    { key: "postalCode", label: "Postal code", type: "string" },
    { key: "country", label: "Country", type: "string", hint: "ISO 3166-1 2-character code." },
    { key: "latitude", label: "Latitude", type: "string" },
    { key: "longitude", label: "Longitude", type: "string" },
    { key: "extra", label: "Additional fields", type: "json" },
  ],
  output: [
    { key: "id", type: "string", label: "ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "address", type: "object", label: "Address" },
    { key: "capacity", type: "number", label: "Capacity" },
    { key: "age_restriction", type: "string", label: "Age restriction" },
    { key: "latitude", type: "string", label: "Latitude" },
    { key: "longitude", type: "string", label: "Longitude" },
    { key: "resource_uri", type: "string", label: "Resource URI" },
  ],
  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    const venue: Record<string, unknown> = {};
    if (input.name !== undefined) venue.name = input.name;
    if (input.organizerId !== undefined) venue.organizer_id = input.organizerId;
    if (input.googlePlaceId !== undefined) venue.google_place_id = input.googlePlaceId;
    if (input.ageRestriction !== undefined) venue.age_restriction = input.ageRestriction;
    if (input.capacity !== undefined) venue.capacity = input.capacity;
    const address: Record<string, unknown> = {};
    if (input.address1 !== undefined) address.address_1 = input.address1;
    if (input.address2 !== undefined) address.address_2 = input.address2;
    if (input.city !== undefined) address.city = input.city;
    if (input.region !== undefined) address.region = input.region;
    if (input.postalCode !== undefined) address.postal_code = input.postalCode;
    if (input.country !== undefined) address.country = input.country;
    if (input.latitude !== undefined) address.latitude = input.latitude;
    if (input.longitude !== undefined) address.longitude = input.longitude;
    if (Object.keys(address).length) venue.address = address;
    return client.request(`/organizations/${encodeURIComponent(input.organizationId)}/venues/`, {
      method: "POST",
      body: { venue: deepMerge(venue, input.extra) },
    });
  },
};

export default createVenue;
