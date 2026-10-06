import type { ActionDefinition } from "@w6w/types";
import { bool, call, compact, need, seg, str } from "../lib/client.ts";

/**
 * `POST /v3/content_types/{contentTypeUid}/entries/{entryUid}/workflow` — verified 2026-10-06 against Contentstack's CMA
 * reference and its OpenAPI file (`cma-openapi-3.json`, v3.0.1).
 */
const action: ActionDefinition = {
  key: "set-entry-workflow-stage",
  type: "perform",
  resource: "entry",
  title: "Set Entry Workflow Stage",
  description: "Move an entry to a workflow stage.",
  idempotent: true,
  params: [
    {
      key: "contentTypeUid",
      label: "Content type UID",
      type: "string",
      required: true,
      hint: "UID of the content type, e.g. blog_post.",
    },
    { key: "entryUid", label: "Entry UID", type: "string", required: true },
    { key: "workflowStageUid", label: "Workflow stage UID", type: "string", required: true },
    { key: "comment", label: "Comment", type: "string" },
    { key: "dueDate", label: "Due date", type: "string", hint: "Due date, e.g. Thu Dec 01 2026." },
    { key: "notify", label: "Notify", type: "boolean", hint: "Notify the assignees." },
    { key: "locale", label: "Locale", type: "string" },
  ],
  output: [
    { key: "notice", type: "string", label: "Vendor message" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const contentTypeUid = need("contentTypeUid", str(p.contentTypeUid));
    const entryUid = need("entryUid", str(p.entryUid));
    const workflowStageUid = need("workflowStageUid", str(p.workflowStageUid));
    const comment = str(p.comment);
    const dueDate = str(p.dueDate);
    const notify = bool(p.notify);
    const locale = str(p.locale);
    ctx.log("info", "Contentstack Set Entry Workflow Stage", { contentTypeUid, entryUid });
    return await call(
      ctx,
      "POST",
      `/content_types/${seg(contentTypeUid)}/entries/${seg(entryUid)}/workflow`,
      {
        query: { locale },
        body: {
          workflow: {
            workflow_stage: compact({ uid: workflowStageUid, comment, due_date: dueDate, notify }),
          },
        },
      },
    );
  },
};

export default action;
