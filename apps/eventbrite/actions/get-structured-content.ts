import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";

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
  output: [
    { key: "access_type", type: "string", label: "Access type" },
    { key: "modules", type: "array", label: "Modules" },
    { key: "widgets", type: "array", label: "Widgets" },
    { key: "page_version_number", type: "string", label: "Page version number" },
    { key: "pagination", type: "object", label: "Pagination" },
    { key: "purpose", type: "string", label: "Purpose" },
  ],
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
