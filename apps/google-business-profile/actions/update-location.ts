import type { ActionDefinition } from "@w6w/types";
import {
  BUSINESS_INFORMATION_URL,
  GoogleBusinessProfileClient,
  locationName,
} from "../lib/client.ts";

interface Input {
  locationId: string;
  title?: string;
  websiteUri?: string;
  primaryPhone?: string;
  addressRegionCode?: string;
  addressLocality?: string;
  addressAdministrativeArea?: string;
  addressPostalCode?: string;
  addressLines?: string[];
  description?: string;
  storeCode?: string;
  languageCode?: string;
  latitude?: number;
  longitude?: number;
  openStatus?: "OPEN" | "CLOSED_TEMPORARILY" | "CLOSED_PERMANENTLY";
  validateOnly?: boolean;
}

interface LocationPatch {
  title?: string;
  websiteUri?: string;
  phoneNumbers?: { primaryPhone: string };
  storefrontAddress?: {
    regionCode?: string;
    locality?: string;
    administrativeArea?: string;
    postalCode?: string;
    addressLines?: string[];
  };
  profile?: { description: string };
  storeCode?: string;
  languageCode?: string;
  latlng?: { latitude?: number; longitude?: number };
  openInfo?: { status: string };
}

/**
 * `locations.patch` — https://developers.google.com/my-business/reference/businessinformation/rest/v1/locations/patch
 *
 * Google requires `updateMask` to name every top-level field being changed;
 * this action derives it from which params were actually supplied so a
 * caller never has to keep the two in sync by hand.
 */
const updateLocation: ActionDefinition<Input> = {
  key: "update-location",
  type: "perform",
  resource: "location",
  title: "Update Location",
  description:
    "Patch fields on an existing location. Only supplied fields are sent; omit a field to leave it untouched.",
  // Retrying with the same params re-sends the same masked fields with the
  // same values, so a retry converges on the same end state.
  idempotent: true,
  params: [
    { key: "locationId", label: "Location ID", type: "string", required: true },
    { key: "title", label: "Business name", type: "string" },
    { key: "websiteUri", label: "Website URL", type: "string" },
    { key: "primaryPhone", label: "Primary phone", type: "string" },
    { key: "addressRegionCode", label: "Address: region code (CLDR)", type: "string" },
    { key: "addressLocality", label: "Address: city/town", type: "string" },
    { key: "addressAdministrativeArea", label: "Address: state/province", type: "string" },
    { key: "addressPostalCode", label: "Address: postal code", type: "string" },
    { key: "addressLines", label: "Address: street lines", type: "string", repeat: true },
    { key: "description", label: "Business description", type: "text" },
    { key: "storeCode", label: "Store code", type: "string" },
    { key: "languageCode", label: "Language (BCP-47)", type: "string" },
    { key: "latitude", label: "Latitude", type: "number" },
    { key: "longitude", label: "Longitude", type: "number" },
    {
      key: "openStatus",
      label: "Open status",
      type: "select",
      options: [
        { value: "OPEN", label: "Open" },
        { value: "CLOSED_TEMPORARILY", label: "Temporarily closed" },
        { value: "CLOSED_PERMANENTLY", label: "Permanently closed" },
      ],
    },
    {
      key: "validateOnly",
      label: "Validate only",
      type: "boolean",
      default: false,
      hint: "Validate the request without actually updating the location.",
    },
  ],
  output: [
    { key: "name", type: "string", label: "Resource name" },
    { key: "title", type: "string", label: "Business name" },
  ],

  execute(input, ctx) {
    const client = new GoogleBusinessProfileClient(ctx);
    const body: LocationPatch = {};
    const mask: string[] = [];

    if (input.title !== undefined) {
      body.title = input.title;
      mask.push("title");
    }
    if (input.websiteUri !== undefined) {
      body.websiteUri = input.websiteUri;
      mask.push("websiteUri");
    }
    if (input.primaryPhone !== undefined) {
      body.phoneNumbers = { primaryPhone: input.primaryPhone };
      mask.push("phoneNumbers");
    }
    if (
      input.addressRegionCode !== undefined || input.addressLocality !== undefined ||
      input.addressAdministrativeArea !== undefined || input.addressPostalCode !== undefined ||
      input.addressLines !== undefined
    ) {
      body.storefrontAddress = {
        regionCode: input.addressRegionCode,
        locality: input.addressLocality,
        administrativeArea: input.addressAdministrativeArea,
        postalCode: input.addressPostalCode,
        addressLines: input.addressLines,
      };
      mask.push("storefrontAddress");
    }
    if (input.description !== undefined) {
      body.profile = { description: input.description };
      mask.push("profile");
    }
    if (input.storeCode !== undefined) {
      body.storeCode = input.storeCode;
      mask.push("storeCode");
    }
    if (input.languageCode !== undefined) {
      body.languageCode = input.languageCode;
      mask.push("languageCode");
    }
    if (input.latitude !== undefined || input.longitude !== undefined) {
      body.latlng = { latitude: input.latitude, longitude: input.longitude };
      mask.push("latlng");
    }
    if (input.openStatus !== undefined) {
      body.openInfo = { status: input.openStatus };
      mask.push("openInfo");
    }

    return client.request(BUSINESS_INFORMATION_URL, `/${locationName(input.locationId)}`, {
      method: "PATCH",
      body,
      query: { updateMask: mask.join(","), validateOnly: input.validateOnly },
    });
  },
};

export default updateLocation;
