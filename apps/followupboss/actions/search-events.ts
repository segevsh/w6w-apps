import type { ActionDefinition } from "@w6w/types";
import {
  EVENT_TYPES,
  FubClient,
  type FubList,
  PAGE_OUTPUT,
  PAGE_PARAMS,
  type PageInput,
  pageQuery,
} from "../lib/client.ts";

interface Input extends PageInput {
  personId?: number;
  type?: string;
  hasProperty?: boolean;
  propertyAddress?: string;
}

/**
 * `GET /events` — read the lead-activity timeline.
 *
 * The endpoint carries a caveat worth surfacing rather than discovering: "Some
 * lead events are not accessible via API and are only visible within the Follow
 * Up Boss application." So an empty or short result is not proof that nothing
 * happened, and this should not be used as an audit log.
 *
 * `type` is documented as a **comma-separated list** of the same fourteen values
 * Create Event accepts, so this is a `multiselect` joined on commas rather than
 * a single choice.
 *
 * The `events` context is one of the more tightly metered: 20 requests per
 * 10-second window for a registered system, 10 without. (`POST /events` is on a
 * separate, unlimited context — reading is the throttled direction here, not
 * writing.) Paging through a large timeline is therefore worth doing with
 * `next` and a large `limit` rather than many small requests.
 */
const searchEvents: ActionDefinition<Input> = {
  key: "search-events",
  type: "search",
  resource: "event",
  title: "Search Events",
  description:
    "Search lead events — inquiries, property views, registrations — optionally scoped to one " +
    "person, one or more event types, or a property address. Note some events are visible only " +
    "in the Follow Up Boss UI and never appear here.",
  params: [
    {
      key: "personId",
      label: "Person id",
      type: "number",
      hint: "Return only events attached to this contact.",
    },
    {
      key: "type",
      label: "Event types",
      type: "multiselect",
      options: EVENT_TYPES.map((value) => ({ value, label: value })),
      hint: "One or more event types. Sent comma-separated.",
    },
    {
      key: "propertyAddress",
      label: "Property address",
      type: "string",
      advanced: true,
      hint: "Searches property addresses, including partial matches.",
    },
    {
      key: "hasProperty",
      label: "Has property",
      type: "boolean",
      advanced: true,
      hint: "Filter to events that do (or do not) have a property attached.",
    },
    ...PAGE_PARAMS,
  ],
  output: PAGE_OUTPUT,

  execute(input, ctx): Promise<FubList> {
    return new FubClient(ctx).list("/events", {
      query: {
        ...pageQuery(input),
        personId: input.personId,
        // A multiselect hands back an array; the API wants one comma-joined
        // string. Normalised here so a single string value still works.
        type: Array.isArray(input.type) ? input.type.join(",") : input.type,
        hasProperty: input.hasProperty,
        propertyAddress: input.propertyAddress,
      },
    });
  },
};

export default searchEvents;
