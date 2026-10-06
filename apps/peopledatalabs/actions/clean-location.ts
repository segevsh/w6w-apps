import type { ActionDefinition } from "@w6w/types";
import { PdlClient } from "../lib/client.ts";

interface Input {
  location: string;
}

const cleanLocation: ActionDefinition<Input> = {
  key: "clean-location",
  type: "read",
  resource: "cleaner",
  title: "Clean Location",
  description:
    "Parse a free-form location into PDL's canonical form (city, region, country, continent, geo coordinates). Free up to 10,000 calls a month. No match is found: false, not an error.",
  params: [
    {
      key: "location",
      label: "Location",
      type: "string",
      required: true,
      placeholder: "San Francisco",
    },
  ],
  output: [
    { key: "found", type: "boolean", label: "True when PDL parsed the location" },
    { key: "status", type: "number", label: "PDL status" },
    { key: "name", type: "string", label: "Canonical location name" },
    { key: "locality", type: "string", label: "City" },
    { key: "region", type: "string", label: "State / region" },
    { key: "country", type: "string", label: "Country" },
    { key: "geo", type: "string", label: "Latitude,longitude" },
  ],

  async execute(input, ctx) {
    if (typeof input.location !== "string" || input.location.trim() === "") {
      throw new Error("location is required.");
    }
    return await new PdlClient(ctx).request("GET", "/v5/location/clean", {
      query: { location: input.location },
      notFound: {},
    });
  },
};

export default cleanLocation;
