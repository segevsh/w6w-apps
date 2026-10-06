import type { ActionDefinition } from "@w6w/types";
import { asNumber, asText, LodgifyClient } from "../lib/client.ts";

/**
 * List properties. Wraps `GET /v2/properties` ("Properties info list", operationId
 * GetAllPropertiesAsync): a paged list of every property. Documented query: `wid`,
 * `updatedSince`, `includeCount`, `includeInOut`, `page` (default 1) and `size`
 * (max 50, default 50). The response is `{count, items[]}`; `count` is only present when
 * `includeCount` is true.
 */
const action: ActionDefinition = {
  key: "list-properties",
  type: "read",
  resource: "property",
  title: "List properties",
  description: "List the account's properties, 50 per page, optionally only those changed " +
    "since a date.",
  params: [
    { key: "page", label: "Page", type: "number", hint: "Page number, starting at 1." },
    { key: "size", label: "Page size", type: "number", hint: "Items per page, at most 50." },
    {
      key: "updatedSince",
      label: "Updated since",
      type: "datetime",
      hint: "Only include properties modified since this date.",
    },
    {
      key: "includeCount",
      label: "Include total count",
      type: "boolean",
      hint: "Also return the total number of properties as `count`.",
    },
    {
      key: "includeInOut",
      label: "Include check-in/out dates",
      type: "boolean",
      hint: "Include the dates available for arrival or departure.",
    },
    {
      key: "websiteId",
      label: "Website ID",
      type: "number",
      hint: "Return text localised for this website (the `wid` query parameter).",
    },
  ],
  output: [
    { key: "count", type: "number", label: "Total properties (when requested)" },
    { key: "items", type: "array", label: "Properties" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    return await new LodgifyClient(ctx).request("/v2/properties", {
      query: {
        page: asNumber(p.page),
        size: asNumber(p.size),
        updatedSince: asText(p.updatedSince),
        includeCount: p.includeCount === true ? true : undefined,
        includeInOut: p.includeInOut === true ? true : undefined,
        wid: asNumber(p.websiteId),
      },
    });
  },
};

export default action;
