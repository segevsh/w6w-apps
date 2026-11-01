import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";
import {
  PAGINATION_OUTPUT,
  PAGINATION_SAMPLE,
  STRUCTURED_CONTENT_OUTPUT,
  STRUCTURED_CONTENT_SAMPLE,
} from "../lib/outputs.ts";

interface Input {
  eventId: string;
  version?: "published" | "working";
  purpose?: "listing" | "digital_content";
}

const getStructuredContent: ActionDefinition<Input> = {
  key: "get-structured-content",
  type: "read",
  resource: "event",
  title: "Get Structured Content",
  description:
    "Retrieve an event's structured content (description modules and widgets): the latest published version, or the latest working version (published or not).",
  params: [
    { key: "eventId", label: "Event ID", type: "string", required: true },
    {
      key: "version",
      label: "Version",
      type: "select",
      default: "published",
      options: [
        { value: "published", label: "Latest published" },
        { value: "working", label: "Latest working (incl. unpublished)" },
      ],
    },
    {
      key: "purpose",
      label: "Purpose",
      type: "select",
      default: "listing",
      options: [
        { value: "listing", label: "Listing (event description)" },
        { value: "digital_content", label: "Digital content" },
      ],
    },
  ],
  output: [...STRUCTURED_CONTENT_OUTPUT, ...PAGINATION_OUTPUT],
  sample: { ...STRUCTURED_CONTENT_SAMPLE, pagination: PAGINATION_SAMPLE },
  idempotent: true,

  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    const base = `/events/${encodeURIComponent(input.eventId)}/structured_content/`;
    return client.request(input.version === "working" ? `${base}edit/` : base, {
      query: { purpose: input.purpose },
    });
  },
};

export default getStructuredContent;
