import type { ActionDefinition } from "@w6w/types";
import { AtlasClient, csv, projectId, query } from "../lib/client.ts";
import { PAGE_PARAMS, PROJECT_PARAM } from "../lib/params.ts";

/**
 * `GET /api/atlas/v2/groups/{groupId}/events` — the project's audit trail.
 *
 * ## This is what answers "who changed that, and when"
 *
 * Cluster creations, deletions, scaling, user additions, access-list edits,
 * failed logins — Atlas records them all here, with the actor. It is the only
 * retrospective view this API offers, and it is the one an automation should
 * be reading after somebody asks why production resized itself on Tuesday.
 *
 * ## The actor of an automated change is the service account
 *
 * Which means events created by *this app* look like events created by any
 * other automation holding the same credential. Giving each automation its own
 * service account is what makes this log readable later, and there is no way
 * to reconstruct it afterwards.
 *
 * ## Newest first, and the window is what makes it usable
 *
 * A busy project generates a great many events. `minDate` is how a workflow
 * asks "since the last time I looked" — without it, page one is the last few
 * minutes and the question "did anything happen today" needs paging.
 */
const action: ActionDefinition = {
  key: "event-list",
  type: "search",
  resource: "event",
  title: "List project events",
  description:
    "The project's audit trail — who created, resized or deleted what, and when. Events caused " +
    "by automation are attributed to the SERVICE ACCOUNT, so one account per automation is what " +
    "makes this readable.",
  params: [
    PROJECT_PARAM,
    {
      key: "eventTypes",
      label: "Event Types",
      type: "string",
      default: "",
      placeholder: "CLUSTER_DELETED, JOINED_GROUP",
      hint: "Comma-separated. Atlas's own UPPER_SNAKE names.",
    },
    {
      key: "minDate",
      label: "Since",
      type: "string",
      default: "",
      placeholder: "2026-08-01T00:00:00Z",
      hint: "ISO 8601. Without it, page one is the last few minutes.",
    },
    {
      key: "maxDate",
      label: "Until",
      type: "string",
      default: "",
      advanced: true,
    },
    ...PAGE_PARAMS,
  ],
  output: [
    { key: "events", type: "array", label: "The events, newest first" },
    { key: "count", type: "number", label: "Returned in this page" },
    { key: "eventTypes", type: "array", label: "The distinct types in this page" },
    { key: "latest", type: "object", label: "The most recent event" },
    { key: "totalCount", type: "number", label: "Across all pages" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = projectId(p.projectId);

    const { results, totalCount } = await new AtlasClient(ctx).list<{
      eventTypeName?: string;
      created?: string;
      username?: string;
    }>(`/api/atlas/v2/groups/${id}/events`, {
      query: query({
        eventType: csv(p.eventTypes)?.join(","),
        minDate: p.minDate,
        maxDate: p.maxDate,
        itemsPerPage: Math.min(500, Math.max(1, Number(p.itemsPerPage ?? 100))),
        pageNum: Math.max(1, Number(p.pageNum ?? 1)),
      }),
    });

    const eventTypes = [
      ...new Set(results.map((event) => event?.eventTypeName).filter(Boolean) as string[]),
    ].sort();

    // Counts and types. The events themselves name people and clusters.
    ctx.log("info", "read Atlas project events", { count: results.length });

    return {
      events: results,
      count: results.length,
      eventTypes,
      latest: results[0],
      totalCount,
    };
  },
};

export default action;
