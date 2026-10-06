import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";
import { deepMerge } from "../lib/merge.ts";

interface Input {
  eventId: string;
  version: string;
  modules: unknown[];
  publish?: boolean;
  purpose?: "listing" | "digital_content";
  accessType?: "public" | "private";
  extra?: Record<string, unknown>;
}

const setStructuredContent: ActionDefinition<Input> = {
  key: "set-structured-content",
  type: "perform",
  idempotent: true,
  resource: "event",
  title: "Set Structured Content",
  description:
    "Create or replace the structured content (description modules) of an event for a given page version on Eventbrite. Send the full current module set; enable Publish to make it visible on the public event page.",
  params: [
    { key: "eventId", label: "Event ID", type: "string", required: true },
    {
      key: "version",
      label: "Page version",
      type: "string",
      required: true,
      hint:
        "Structured content version number; must match the current page version (see Get Structured Content `page_version_number`).",
    },
    {
      key: "modules",
      label: "Modules",
      type: "json",
      required: true,
      hint:
        'Array of modules, e.g. `[{"type":"text","data":{"body":{"type":"text","text":"<p>Hi</p>","alignment":"left"}}}]`.',
    },
    {
      key: "publish",
      label: "Publish",
      type: "boolean",
      hint: "Publish after saving. Always send the full module set with it.",
    },
    {
      key: "purpose",
      label: "Purpose",
      type: "select",
      options: [
        { value: "listing", label: "Listing (event description)" },
        { value: "digital_content", label: "Digital content" },
      ],
    },
    {
      key: "accessType",
      label: "Access type",
      type: "select",
      options: [
        { value: "public", label: "Public" },
        { value: "private", label: "Private" },
      ],
      hint: "Digital content pages only.",
    },
    {
      key: "extra",
      label: "Additional fields",
      type: "json",
      advanced: true,
      hint: "Object deep-merged into the request body.",
    },
  ],
  output: [
    { key: "access_type", type: "string", label: "Access type" },
    { key: "modules", type: "array", label: "Modules" },
    { key: "widgets", type: "array", label: "Widgets" },
    { key: "page_version_number", type: "string", label: "Page version number" },
    { key: "purpose", type: "string", label: "Purpose" },
  ],

  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    const body: Record<string, unknown> = { modules: input.modules };
    if (input.publish !== undefined) body.publish = input.publish;
    if (input.purpose) body.purpose = input.purpose;
    if (input.accessType) body.access_type = input.accessType;
    return client.request(
      `/events/${encodeURIComponent(input.eventId)}/structured_content/${
        encodeURIComponent(input.version)
      }/`,
      { method: "POST", body: input.extra ? deepMerge(body, input.extra) : body },
    );
  },
};

export default setStructuredContent;
