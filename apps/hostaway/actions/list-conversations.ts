import type { ActionDefinition } from "@w6w/types";
import { asNumber, HostawayClient } from "../lib/client.ts";

/**
 * List the account's conversations. Wraps `GET /v1/conversations`.
 *
 * Documented query parameters, verbatim: `limit` ("Maximum number of items in the
 * list"), `offset` ("Number of items to skip from beginning of the list"),
 * `reservationId` ("reservation id") and `includeResources` ("if includeResources flag
 * is 1 then response objects are supplied with supplementary resources, default is 0").
 *
 * There is NO documented `listingMapId` filter on this endpoint — the docs' own
 * request example is
 * `https://api.hostaway.com/v1/conversations?reservationId=&limit=&offset=&includeResources=`
 * — so none is sent (see the README). To find a listing's conversations, list its
 * reservations and filter by `reservationId`, or use
 * `GET /v1/reservations/{reservationId}/conversations` (not in this app's action set).
 *
 * Response: "An array of conversation objects."
 */
const action: ActionDefinition = {
  key: "list-conversations",
  type: "search",
  resource: "conversation",
  title: "List conversations",
  description: "List guest conversations, optionally for one reservation.",
  params: [
    { key: "limit", label: "Limit", type: "number" },
    { key: "offset", label: "Offset", type: "number", default: 0 },
    { key: "reservationId", label: "Reservation ID", type: "number" },
    {
      key: "includeResources",
      label: "Include resources",
      type: "boolean",
      hint: "Return supplementary resources instead of the empty arrays they default to.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Conversations" },
    { key: "count", type: "number", label: "Total matching conversations" },
    { key: "page", type: "number", label: "Page number" },
    { key: "totalPages", type: "number", label: "Total pages" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    return await new HostawayClient(ctx).requestPage("/conversations", {
      query: {
        limit: asNumber(p.limit),
        offset: asNumber(p.offset),
        reservationId: asNumber(p.reservationId),
        includeResources: asNumber(p.includeResources),
      },
    });
  },
};

export default action;
