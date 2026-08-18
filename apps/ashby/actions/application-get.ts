import type { ActionDefinition } from "@w6w/types";
import { AshbyClient, compact, csv } from "../lib/client.ts";

/**
 * `POST /application.info` — one application in full.
 *
 * The second lookup key is the useful one. `submittedFormInstanceId` is what
 * `applicationForm.submit` returns when somebody applies through a custom
 * careers page, so a workflow that received a form submission can fetch the
 * application it became without storing an id mapping.
 *
 * If both are given, Ashby uses `applicationId` — which is worth knowing,
 * because passing a stale form id alongside a good application id looks like it
 * worked.
 */
const action: ActionDefinition = {
  key: "application-get",
  type: "read",
  resource: "application",
  title: "Get an application",
  description:
    "One application, by its id or by the form-submission id a custom careers page returns — " +
    "the second removes an id-mapping step. If both are given, Ashby uses the application id.",
  params: [
    { key: "applicationId", label: "Application ID", type: "string", default: "" },
    {
      key: "submittedFormInstanceId",
      label: "Submitted Form Instance ID",
      type: "string",
      default: "",
      hint: "Returned by `applicationForm.submit` when somebody applies through your own page.",
    },
    {
      key: "expand",
      label: "Expand",
      type: "string",
      default: "",
      advanced: true,
      hint: "Comma-separated related objects to include inline.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Application ID" },
    { key: "status", type: "string", label: "Active, Hired, Archived or Lead" },
    { key: "currentInterviewStage", type: "object", label: "Where it is in the process" },
    { key: "candidate", type: "object", label: "The person" },
    { key: "job", type: "object", label: "The role" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const applicationId = String(p.applicationId ?? "").trim();
    const formId = String(p.submittedFormInstanceId ?? "").trim();
    if (!applicationId && !formId) {
      throw new Error("give an `applicationId` or a `submittedFormInstanceId`");
    }

    return await new AshbyClient(ctx).request("application.info", {
      body: compact({
        applicationId,
        submittedFormInstanceId: applicationId ? undefined : formId,
        expand: csv(p.expand),
      }),
    });
  },
};

export default action;
