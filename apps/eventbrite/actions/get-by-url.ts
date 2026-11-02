import type { ActionDefinition, OutputField } from "@w6w/types";
import { API_URL, EventbriteClient } from "../lib/client.ts";
import { checkResourceUrl, normalizeExpand } from "../lib/resource-url.ts";

interface Input {
  url: string;
  expand?: string;
}

/**
 * What every Eventbrite record carries, plus the type this action derives. The rest of the
 * record depends on what the URL points at, so it is not declared.
 */
const OUTPUT: OutputField[] = [
  { key: "resource_type", type: "string", label: "Resource type" },
  { key: "id", type: "string", label: "ID" },
  { key: "resource_uri", type: "string", label: "Resource URI" },
];

/** Synthetic: a fake order id, no real data. */
const SAMPLE = {
  resource_type: "order",
  id: "1000000003",
  resource_uri: `${API_URL}/orders/1000000003/`,
};

const getByUrl: ActionDefinition<Input> = {
  key: "get-by-url",
  type: "read",
  idempotent: true,
  title: "Get resource by URL",
  description:
    "Fetch any Eventbrite record from its API URL, such as the api_url a webhook delivers. " +
    "Returns the record plus resource_type (event, order, attendee, ticket_class, …) for routing.",
  params: [
    {
      key: "url",
      label: "URL",
      type: "string",
      required: true,
      placeholder: `${API_URL}/orders/123/`,
      hint:
        "An Eventbrite API URL (https://www.eventbriteapi.com/v3/…), e.g. {{ trigger.event.apiUrl }} " +
        "or a webhook body's api_url. Any other host is refused.",
    },
    {
      key: "expand",
      label: "Expand",
      type: "string",
      placeholder: "attendees,event",
      hint: "Comma-separated expansions, sent as ?expand=.",
    },
  ],
  output: OUTPUT,
  sample: SAMPLE,

  async execute(input, ctx) {
    const { url, resourceType } = checkResourceUrl(input.url);
    const expand = normalizeExpand(input.expand);
    const body = await new EventbriteClient(ctx).request<unknown>(url.toString(), {
      query: { expand },
    });
    const record = body !== null && typeof body === "object" && !Array.isArray(body)
      ? body as Record<string, unknown>
      : { body };
    return { ...record, resource_type: resourceType };
  },
};

export default getByUrl;
