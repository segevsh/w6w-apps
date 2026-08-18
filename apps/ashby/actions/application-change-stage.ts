import type { ActionDefinition } from "@w6w/types";
import { AshbyClient, compact } from "../lib/client.ts";

/**
 * `POST /application.changeStage` — move somebody through the process.
 *
 * This is the action with consequences for a person. Advancing an application
 * can trigger scheduling and notifications; moving it to an archived stage is
 * **a rejection**, and Ashby may email the candidate about it.
 *
 * ## Archiving needs a reason, and that is a feature
 *
 * When the destination stage has type `Archived`, `archiveReasonId` is
 * **required** — Ashby will not let a rejection be recorded as "no reason
 * given". The reasons are the organisation's own (`archive-reason-list` maps
 * them), and they are what every funnel report is grouped by, so a workflow
 * that always passes the same generic reason quietly destroys the reporting it
 * was meant to feed.
 *
 * This action cannot see the destination stage's type before calling, so it
 * cannot pre-empt the requirement — but it does explain the refusal when Ashby
 * returns it, which otherwise reads as an opaque `success: false`.
 *
 * ## `archiveEmail` sends a rejection
 *
 * Off unless explicitly set. A workflow that rejects candidates in bulk and
 * accidentally emails all of them is not recoverable, so the default here is
 * the quiet one and the parameter says exactly what it does.
 *
 * Stage ids come from `interview-stage-list` for the job's interview plan.
 */
const action: ActionDefinition = {
  key: "application-change-stage",
  type: "perform",
  resource: "application",
  title: "Move an application to a stage",
  description:
    "Advance or archive an application. Moving to an archived stage IS a rejection and requires " +
    "a reason; emailing the candidate is off unless you ask for it.",
  idempotent: true,
  params: [
    { key: "applicationId", label: "Application ID", type: "string", required: true, default: "" },
    {
      key: "interviewStageId",
      label: "Interview Stage ID",
      type: "string",
      required: true,
      default: "",
      hint: "From `interview-stage-list` for the job's interview plan.",
    },
    {
      key: "archiveReasonId",
      label: "Archive Reason ID",
      type: "string",
      default: "",
      hint: "REQUIRED when the destination stage is an archive stage — Ashby refuses without " +
        "it. `archive-reason-list` maps your organisation's reasons to ids, and funnel reports " +
        "are grouped by them, so a single generic reason destroys the reporting.",
    },
    {
      key: "archiveEmail",
      label: "Send Rejection Email",
      type: "json",
      default: "",
      advanced: true,
      hint: "Omit to archive silently. Supplying it emails the candidate — irreversible, and " +
        "unforgiving in a bulk run.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Application ID" },
    { key: "status", type: "string", label: "Status after the move" },
    { key: "currentInterviewStage", type: "object", label: "Where it now sits" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const applicationId = String(p.applicationId ?? "").trim();
    const interviewStageId = String(p.interviewStageId ?? "").trim();
    if (!applicationId) throw new Error("`applicationId` is required");
    if (!interviewStageId) throw new Error("`interviewStageId` is required");

    const archiveEmail = p.archiveEmail;
    if (archiveEmail !== undefined && archiveEmail !== null && archiveEmail !== "") {
      ctx.log("warn", "moving an Ashby application with a rejection email attached", {
        applicationId,
      });
    }

    try {
      return await new AshbyClient(ctx).request("application.changeStage", {
        body: compact({
          applicationId,
          interviewStageId,
          archiveReasonId: p.archiveReasonId,
          archiveEmail,
        }),
      });
    } catch (err) {
      // Ashby's refusal here is opaque; the cause is almost always this one.
      if (/archive/i.test(String(err)) && !p.archiveReasonId) {
        throw new Error(
          `${err} — moving to an archived stage requires \`archiveReasonId\`; ` +
            "`archive-reason-list` has your organisation's reasons",
        );
      }
      throw err;
    }
  },
};

export default action;
