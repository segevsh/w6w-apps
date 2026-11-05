import type { ActionDefinition } from "@w6w/types";
import { isObject, query, requiredString } from "../lib/client.ts";

const action: ActionDefinition = {
  key: "event-get",
  type: "read",
  resource: "events",
  title: "Get event",
  description: "Read a DICE event by its GraphQL ID, including venue and ticket-type metadata.",
  params: [{
    key: "id",
    label: "Event ID",
    type: "string",
    required: true,
    hint: "GraphQL event ID from List events.",
  }],
  output: [{ key: "event", type: "object", label: "Event" }],
  async execute(input, ctx) {
    const id = requiredString(input.id, "id");
    const data = await query(
      ctx,
      `query W6WEvent($id: ID!) {
      node(id: $id) { __typename ... on Event {
        id name state startDatetime endDatetime description currency url updatedAt
        totalTicketAllocationQty artists { name } venues { id name } ticketTypes { id name description }
      } }
    }`,
      { id },
    );
    if (!isObject(data.node) || data.node.__typename !== "Event") {
      throw new Error("DICE event not found or not accessible.");
    }
    const { __typename: _type, ...event } = data.node;
    return { event };
  },
};
export default action;
