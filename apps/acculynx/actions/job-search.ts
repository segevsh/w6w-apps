import type { ActionDefinition } from "@w6w/types";
import { AccuLynxClient, compact } from "../lib/client.ts";
import { includesParam, PAGED_OUTPUT, pageQuery, pagingParams } from "../lib/params.ts";

interface Input {
  searchTerm?: string;
  latitude?: number;
  longitude?: number;
  mapRadius?: number;
  pageSize?: number;
  startIndex?: number;
  includes?: string;
}

const action: ActionDefinition<Input> = {
  key: "job-search",
  type: "search",
  resource: "job",
  title: "Search Jobs",
  description:
    "Find jobs by a search term, by proximity to a map point, or both (both must match). At least one of search term or latitude/longitude is required.",
  params: [
    {
      key: "searchTerm",
      label: "Search term",
      type: "string",
      hint: "Matched against job fields such as address and name.",
    },
    { key: "latitude", label: "Latitude", type: "number", advanced: true },
    { key: "longitude", label: "Longitude", type: "number", advanced: true },
    {
      key: "mapRadius",
      label: "Map radius",
      type: "number",
      advanced: true,
      hint:
        "Radius around the point, in the units AccuLynx documents for mapRadius (the reference example uses 1 for one kilometre).",
    },
    ...pagingParams(25),
    includesParam("contact, initialAppointment"),
  ],
  output: [...PAGED_OUTPUT],

  async execute(input, ctx) {
    const { searchTerm, latitude, longitude, mapRadius } = input;
    const hasGeo = latitude !== undefined && latitude !== null && longitude !== undefined &&
      longitude !== null;
    if (!searchTerm && !hasGeo) {
      throw new Error("job-search needs a search term or both latitude and longitude");
    }
    const body = {
      ...compact({ searchTerm }),
      ...(hasGeo ? { geoLocation: compact({ latitude, longitude, mapRadius }) } : {}),
    };
    return await new AccuLynxClient(ctx).send("/jobs/search", {
      method: "POST",
      query: { ...pageQuery(input, "recordStartIndex"), includes: input.includes },
      body,
    });
  },
};

export default action;
