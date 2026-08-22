import type { ActionDefinition } from "@w6w/types";
import { AshbyClient } from "../lib/client.ts";

/**
 * `POST /interviewStage.list` — the stages in one interview plan.
 *
 * This is the lookup that makes `application-change-stage` usable: it maps a
 * stage's name — "Recruiter Screen", "Onsite", "Offer" — to the id that action
 * needs.
 *
 * ## Read `type` before moving anybody
 *
 * Each stage has a type, and `Archived` is the one that matters: moving an
 * application into a stage of that type **is a rejection**, and requires an
 * archive reason. A workflow that picks a stage by name without checking the
 * type can reject a candidate while believing it advanced them.
 *
 * So this action separates the archive stages out explicitly rather than
 * leaving the caller to notice.
 *
 * The plan id comes from a job — `job-get` returns the job's interview plan —
 * and stages are **per plan**, so two jobs' "Onsite" stages have different ids.
 * A workflow that hard-codes one id works for one role.
 */
const action: ActionDefinition = {
  key: "interview-stage-list",
  type: "read",
  resource: "interview",
  title: "List interview stages",
  description:
    "Stage names to ids for one interview plan — what `application-change-stage` needs. Stages " +
    "typed `Archived` are rejections, so they are separated out.",
  params: [
    {
      key: "interviewPlanId",
      label: "Interview Plan ID",
      type: "string",
      required: true,
      default: "",
      hint: "From the job. Stages are per plan, so two jobs' 'Onsite' stages have different ids.",
    },
  ],
  output: [
    { key: "stages", type: "array", label: "Stages, in order" },
    { key: "count", type: "number", label: "Stages in the plan" },
    { key: "archiveStages", type: "array", label: "Stages that REJECT rather than advance" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const interviewPlanId = String(p.interviewPlanId ?? "").trim();
    if (!interviewPlanId) throw new Error("`interviewPlanId` is required");

    const results = await new AshbyClient(ctx).request<
      Array<{ id?: string; title?: string; type?: string }>
    >("interviewStage.list", { body: { interviewPlanId } });
    const stages = Array.isArray(results) ? results : [];

    const archiveStages = stages
      .filter((s) => String(s?.type ?? "") === "Archived")
      .map((s) => ({ id: s.id, title: s.title }));

    return { stages, count: stages.length, archiveStages };
  },
};

export default action;
