import type { ActionDefinition } from "@w6w/types";
import { StatuspageClient } from "../lib/client.ts";
import { PAGE_PARAM } from "../lib/params.ts";

/**
 * `GET /pages/{page}/incidents/{incident}` — one incident and its whole
 * timeline.
 *
 * `incident_updates` is the interesting part: every update posted, in order,
 * with the body customers read and whether each was delivered to subscribers.
 * That makes this the call behind a post-incident review — what did we say, when
 * did we say it, and how long was the gap between the outage starting and the
 * first word about it.
 *
 * `components` lists the components the incident named, which is what
 * `incident-resolve` reads to know what to put back.
 */
const action: ActionDefinition = {
  key: "incident-get",
  type: "read",
  resource: "incident",
  title: "Get incident",
  description:
    "One incident with its full update timeline — what customers were told, when, and whether " +
    "each update was actually delivered.",
  params: [
    {
      key: "incidentId",
      label: "Incident ID",
      type: "string",
      required: true,
      default: "",
    },
    PAGE_PARAM,
  ],
  output: [
    { key: "id", type: "string", label: "Incident ID" },
    { key: "name", type: "string", label: "Title" },
    { key: "status", type: "string", label: "Status" },
    { key: "impact", type: "string", label: "Impact" },
    { key: "incident_updates", type: "array", label: "Timeline" },
    { key: "components", type: "array", label: "Affected components" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "resolved_at", type: "string", label: "Resolved at" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const incidentId = String(p.incidentId ?? "").trim();
    if (!incidentId) throw new Error("`incidentId` is required");
    const client = new StatuspageClient(ctx);
    const pageId = client.pageFor(p.pageId);
    return await client.request(
      `/pages/${encodeURIComponent(pageId)}/incidents/${encodeURIComponent(incidentId)}`,
    );
  },
};

export default action;
