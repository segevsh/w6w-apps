import type { ActionDefinition } from "@w6w/types";
import { flatten, resolve, TerraformClient } from "../lib/client.ts";

/**
 * `POST /api/v2/runs/{id}/actions/apply` — confirm the apply.
 *
 * ## This is the call that changes real infrastructure
 *
 * Everything before it is a proposal. This executes it: servers are created
 * and destroyed, DNS moves, databases are replaced. There is no undo — the
 * inverse of an apply is another apply, and for a destroyed resource there
 * may not be one.
 *
 * So this action does not apply blind. It reads the run first and refuses
 * when:
 *
 * - the run is not in a state that can be applied — `planned` and
 *   `policy_override` are the only two, and everything else means the apply
 *   already happened, was discarded, or the plan has not finished;
 * - the plan **destroys** resources and the caller has not acknowledged how
 *   many. A plan that replaces a resource shows as one destruction and one
 *   addition, which is the single most common way an apply does more than the
 *   person confirming it expected.
 *
 * ## `planned_and_finished` cannot be applied, and it is not an error
 *
 * It means the plan found no changes, or the run was plan-only. There is
 * nothing to apply, and the API answers 409. The message here says which.
 *
 * ## The comment is the audit trail
 *
 * `comment` is stored on the run and shown beside it. For an apply confirmed
 * by an automation it is the only record of *why*.
 *
 * ## The action endpoints take a bare body
 *
 * Every other write in this API demands the JSON:API envelope. The
 * `actions/apply`, `actions/discard` and `actions/cancel` endpoints take a
 * plain `{"comment": "…"}` instead — and wrapping it in `{"data": {"type": …,
 * "attributes": …}}` is accepted, with the comment silently dropped.
 */
const action: ActionDefinition = {
  key: "run-apply",
  type: "perform",
  resource: "run",
  title: "Apply a run",
  description:
    "Confirm a planned run, which CHANGES REAL INFRASTRUCTURE and cannot be undone. Reads the " +
    "plan first and refuses to apply destructions without an acknowledgement of how many.",
  idempotent: true,
  params: [
    {
      key: "runId",
      label: "Run ID",
      type: "string",
      required: true,
      default: "",
      placeholder: "run-XXXXXXXXXXXXXXXX",
    },
    {
      key: "comment",
      label: "Comment",
      type: "string",
      default: "Applied by a w6w workflow",
      hint: "Stored on the run. For an apply nobody watched, this is the only record of why.",
    },
    {
      key: "acknowledgeDestroys",
      label: "Destructions I expect",
      type: "number",
      default: 0,
      hint: "Must equal the plan's destruction count before an apply that destroys anything will " +
        "proceed. A REPLACED resource counts as one destruction and one addition.",
    },
  ],
  output: [
    { key: "applied", type: "boolean", label: "Whether the apply was confirmed" },
    { key: "id", type: "string", label: "The run id" },
    { key: "status", type: "string", label: "The status before applying" },
    { key: "adds", type: "number", label: "Resources being added" },
    { key: "changes", type: "number", label: "Resources being changed" },
    { key: "destroys", type: "number", label: "Resources being destroyed" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.runId ?? "").trim();
    if (!id) throw new Error("`runId` is required");

    const client = new TerraformClient(ctx);
    // Read the plan before confirming it — "apply whatever this is" is not a
    // thing to offer.
    const before = await client.request(`/api/v2/runs/${encodeURIComponent(id)}`, {
      query: { include: "plan" },
    });
    const raw = before.data as never;
    const run = flatten(raw) ?? {};
    const plan = resolve(raw, "plan", before.included);
    const status = String(run["status"] ?? "");

    const adds = Number(plan?.["resource-additions"] ?? 0);
    const changes = Number(plan?.["resource-changes"] ?? 0);
    const destroys = Number(plan?.["resource-destructions"] ?? 0);

    if (status !== "planned" && status !== "policy_override") {
      throw new Error(
        `this run is \`${status}\` and cannot be applied` +
          (status === "planned_and_finished"
            ? " — the plan found no changes, or the run was plan-only, so there is nothing to apply"
            : status === "applied"
            ? " — it has already been applied"
            : " — only a run in `planned` or `policy_override` is awaiting confirmation"),
      );
    }

    if (destroys > 0 && Number(p.acknowledgeDestroys ?? 0) !== destroys) {
      throw new Error(
        `this plan destroys ${destroys} resource(s) and \`acknowledgeDestroys\` is ` +
          `${Number(p.acknowledgeDestroys ?? 0)}. Set it to ${destroys} to proceed. A REPLACED ` +
          "resource counts as one destruction and one addition, so this number is often higher " +
          "than the change being made appears to be",
      );
    }

    await client.request(`/api/v2/runs/${encodeURIComponent(id)}/actions/apply`, {
      method: "POST",
      // The `actions/*` endpoints take a BARE object, not the JSON:API
      // envelope every other write in this API requires. Wrapping this in
      // `{data: {type, attributes}}` is accepted and the comment is dropped.
      body: { comment: String(p.comment ?? "").trim() || "Applied by a w6w workflow" },
    });

    ctx.log("warn", "applied a Terraform run — infrastructure is being changed", {
      id,
      adds,
      changes,
      destroys,
    });

    return { applied: true, id, status, adds, changes, destroys };
  },
};

export default action;
