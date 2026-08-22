import type { ActionDefinition } from "@w6w/types";
import { csv, SentryClient } from "../lib/client.ts";
import { ORG_PARAM, PROJECT_PARAM } from "../lib/params.ts";

/**
 * `GET /api/0/projects/{org}/{project}/events/{event_id}/` — verified against
 * Sentry's OpenAPI schema (`getProjectEvent`; scopes
 * `project:read`). The schema states `event_id` is "a 32-character
 * hexadecimal string as reported by the raw event payload", i.e. the event's
 * own id, not the issue's numeric id.
 */
const action: ActionDefinition = {
  key: "event-get",
  type: "read",
  resource: "event",
  title: "Get an event",
  description: "Retrieve one event, including its interfaces (stacktrace, request, tags).",
  params: [
    ORG_PARAM,
    PROJECT_PARAM,
    {
      key: "eventId",
      label: "Event ID",
      type: "string",
      required: true,
      default: "",
      hint: "The 32-character hexadecimal event ID from the raw event payload.",
    },
    {
      key: "environment",
      label: "Environments",
      type: "string",
      default: "",
      hint: "Comma-separated environment names.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Event ID" },
    { key: "eventID", type: "string", label: "Event ID (hex)" },
    { key: "groupID", type: "string", label: "Issue ID" },
    { key: "projectID", type: "string", label: "Project ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "message", type: "string", label: "Message" },
    { key: "platform", type: "string", label: "Platform" },
    { key: "dateReceived", type: "string", label: "Received at" },
    { key: "tags", type: "array", label: "Tags" },
    { key: "entries", type: "array", label: "Entries" },
    { key: "user", type: "object", label: "User" },
    { key: "contexts", type: "object", label: "Contexts" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const project = String(p.projectSlug ?? "").trim();
    const eventId = String(p.eventId ?? "").trim();
    if (!project) throw new Error("`projectSlug` is required");
    if (!eventId) throw new Error("`eventId` is required");

    const client = SentryClient.fromConnection(ctx);
    const org = SentryClient.orgFrom(ctx, p.organizationSlug);
    ctx.log("info", "getting Sentry event", { org, project, eventId });

    return await client.request(
      `/projects/${encodeURIComponent(org)}/${encodeURIComponent(project)}/events/${
        encodeURIComponent(eventId)
      }/`,
      { query: { environment: csv(p.environment) } },
    );
  },
};

export default action;
