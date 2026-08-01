import type { ActionDefinition } from "@w6w/types";
import { compact, PostHogClient, projectPath } from "../lib/client.ts";

/**
 * `POST /api/projects/{project_id}/annotations/` — verified against
 * PostHog's live OpenAPI schema 2026-08-01, including the exact `scope` and
 * `creation_type` enum values (`AnnotationScopeEnum`, `CreationTypeEnum`).
 * `scope: "recording"` is documented as deprecated/rejected by the schema
 * and is deliberately not offered as an option. Requires the
 * `annotation:write` scope.
 */
const action: ActionDefinition = {
  key: "annotation-create",
  type: "perform",
  resource: "annotation",
  title: "Create Annotation",
  description: "Mark a release, incident or other event on PostHog charts.",
  idempotent: false,
  params: [
    {
      key: "content",
      label: "Content",
      type: "text",
      required: true,
      hint: "Annotation text shown on charts. Max 8192 characters.",
    },
    {
      key: "dateMarker",
      label: "Date Marker",
      type: "datetime",
      hint: "When this happened. Leave unset to use the current time.",
    },
    {
      key: "scope",
      label: "Scope",
      type: "select",
      default: "organization",
      hint: "Where this annotation is visible.",
      options: [
        { value: "organization", label: "Organization — every project" },
        { value: "project", label: "Project — this project only" },
        { value: "dashboard", label: "Dashboard — one dashboard (needs Dashboard ID)" },
        { value: "dashboard_item", label: "Insight — one insight (needs Insight ID)" },
      ],
    },
    {
      key: "additionalFields",
      label: "Additional Fields",
      type: "group",
      default: {},
      children: [
        {
          key: "creationType",
          label: "Creation Type",
          type: "select",
          default: "USR",
          hint: "USR for a user-created note, GIT for a bot/deployment note.",
          options: [
            { value: "USR", label: "User" },
            { value: "GIT", label: "GitHub" },
          ],
        },
        {
          key: "dashboardId",
          label: "Dashboard ID",
          type: "number",
          hint: "Required when Scope is Dashboard.",
        },
        {
          key: "dashboardItem",
          label: "Insight ID",
          type: "number",
          hint: "Required when Scope is Insight (dashboard_item).",
        },
        { key: "emoji", label: "Emoji", type: "string", hint: "Max 16 characters." },
        {
          key: "hiddenInUserInterface",
          label: "Hidden in UI",
          type: "boolean",
          hint:
            "Hide from charts/list but keep it readable over the API — for high-frequency markers like deploys.",
        },
      ],
    },
  ],
  output: [
    { key: "id", type: "number", label: "Annotation ID" },
    { key: "content", type: "string", label: "Content" },
    { key: "created_at", type: "string", label: "Created at" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const content = String(p.content ?? "").trim();
    if (!content) throw new Error("`content` is required");
    const dateMarker = typeof p.dateMarker === "string" && p.dateMarker ? p.dateMarker : undefined;
    const scope = (p.scope as string | undefined) ?? undefined;
    const additional = (p.additionalFields ?? {}) as Record<string, unknown>;

    const body = compact({
      content,
      date_marker: dateMarker,
      scope,
      creation_type: additional.creationType as string | undefined,
      dashboard_id: additional.dashboardId as number | undefined,
      dashboard_item: additional.dashboardItem as number | undefined,
      emoji: additional.emoji as string | undefined,
      hidden_in_user_interface: additional.hiddenInUserInterface as boolean | undefined,
    });

    ctx.log("info", "creating PostHog annotation", { scope });

    const client = new PostHogClient(ctx);
    return await client.request(projectPath(ctx.connection, "/annotations/"), {
      method: "POST",
      body,
    });
  },
};

export default action;
