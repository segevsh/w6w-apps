import type { ActionDefinition } from "@w6w/types";
import { assertPerformAs, assertUuid, LeverClient, query } from "../lib/client.ts";

/**
 * `PUT /v1/opportunities/{id}/stage` — move a candidate through the pipeline.
 *
 * ## Moving a stage is a visible act in somebody's hiring process
 *
 * Lever notifies, triggers automations and records the change against a user.
 * That is why `perform_as` matters here even though Lever marks it optional:
 * without it the move appears with no author in a history that recruiters
 * read.
 *
 * ## Stages are per account, and the id is not the name
 *
 * "Phone Screen" in one Lever account is a different UUID from "Phone Screen"
 * in another, and the API takes only the id. A workflow with a hardcoded stage
 * id works until somebody rebuilds the pipeline. `stage-list` is where the
 * current ids live, and looking them up by name at run time is the version
 * that survives.
 *
 * ## Moving backwards is allowed, and looks the same
 *
 * Lever does not enforce an order. Setting a candidate back to an earlier
 * stage succeeds silently, which is occasionally right and is usually a
 * workflow that has confused two stage ids.
 */
const action: ActionDefinition = {
  key: "opportunity-stage-set",
  type: "perform",
  resource: "opportunity",
  title: "Move an opportunity to a stage",
  description:
    "Move a candidate through the pipeline — a visible act that notifies people and triggers " +
    "Lever's own automations. Stage IDS are per account and are not names, so looking them up " +
    "with `stage-list` at run time is what survives a pipeline being rebuilt.",
  idempotent: true,
  params: [
    { key: "opportunityId", label: "Opportunity ID", type: "string", required: true, default: "" },
    {
      key: "stageId",
      label: "Stage ID",
      type: "string",
      required: true,
      default: "",
      hint: "From `stage-list`. A stage NAME is not accepted, and ids differ between accounts.",
    },
    {
      key: "performAs",
      label: "Perform as (user ID)",
      type: "string",
      required: true,
      default: "",
      hint: "Who the move is recorded as. Recruiters read this history.",
    },
  ],
  output: [
    { key: "opportunityId", type: "string", label: "Which candidate" },
    { key: "stageId", type: "string", label: "Where they are now" },
    { key: "previousStageId", type: "string", label: "Where they were" },
    { key: "changed", type: "boolean", label: "Whether this moved anything" },
    { key: "wasArchived", type: "boolean", label: "Moving an archived opportunity is unusual" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const opportunityId = assertUuid(p.opportunityId, "opportunityId");
    const stageId = assertUuid(p.stageId, "stageId");
    const performAs = assertPerformAs(p.performAs);

    const client = new LeverClient(ctx);
    const before = await client.one<{
      stage?: string | { id?: string };
      archived?: unknown;
    }>(`/opportunities/${encodeURIComponent(opportunityId)}`);

    const currentStage = typeof before?.stage === "string" ? before.stage : before?.stage?.id;
    const wasArchived = Boolean(before?.archived);
    if (wasArchived) {
      ctx.log(
        "info",
        "this opportunity is archived, and moving an archived candidate's stage is unusual — " +
          "`opportunity-archive` with no reason is how to reopen one",
        { opportunityId },
      );
    }

    if (currentStage === stageId) {
      return {
        opportunityId,
        stageId,
        previousStageId: currentStage,
        changed: false,
        wasArchived,
      };
    }

    await client.request(`/opportunities/${encodeURIComponent(opportunityId)}/stage`, {
      method: "PUT",
      query: query({ perform_as: performAs }),
      body: { stage: stageId },
    });

    return {
      opportunityId,
      stageId,
      previousStageId: currentStage,
      changed: true,
      wasArchived,
    };
  },
};

export default action;
