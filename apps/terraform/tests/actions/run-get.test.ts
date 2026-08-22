import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action, { AWAITING_DECISION, FINISHED } from "../../actions/run-get.ts";

const run = (status: string, plan?: Record<string, unknown>) => ({
  status: 200,
  body: {
    data: {
      type: "runs",
      id: "run-1",
      attributes: { status, "has-changes": Boolean(plan) },
      relationships: {
        plan: { data: { type: "plans", id: "plan-1" } },
        workspace: { data: { type: "workspaces", id: "ws-1" } },
      },
    },
    included: plan ? [{ type: "plans", id: "plan-1", attributes: plan }] : [],
  },
});

Deno.test("run-get: sideloads the plan, apply and workspace", async () => {
  const { ctx, calls } = mockCtx([run("planned", { "resource-additions": 2 })]);
  await action.execute({ runId: "run-1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v2/runs/run-1");
  assertEquals(url.searchParams.get("include"), "plan,apply,workspace");
});

/** `?include=plan` appends a sibling; `run.plan.x` on the raw body is undefined. */
Deno.test("run-get: joins the sideloaded plan back onto the run", async () => {
  const { ctx } = mockCtx([run("planned", {
    "resource-additions": 3,
    "resource-changes": 1,
    "resource-destructions": 2,
  })]);
  const result = await action.execute({ runId: "run-1" }, ctx) as Record<string, unknown>;
  assertEquals(result.adds, 3);
  assertEquals(result.changes, 1);
  assertEquals(result.destroys, 2);
  assert(result.plan, "the plan is returned, joined back on");
  assertEquals(result.workspaceId, "ws-1");
});

/**
 * The most common way a wait-for-completion loop hangs: a plan with no
 * changes is a success that never becomes `applied`.
 */
Deno.test("run-get: planned_and_finished is finished, not pending", async () => {
  const { ctx } = mockCtx([run("planned_and_finished")]);
  const result = await action.execute({ runId: "run-1" }, ctx) as Record<string, unknown>;
  assertEquals(result.finished, true);
  assertEquals(result.awaitingDecision, false);
  assert(/SUCCESS with no/.test(action.description!), action.description);
});

Deno.test("run-get: the statuses that wait for a person are separated from the terminal ones", () => {
  for (const status of ["planned", "policy_override", "post_plan_awaiting_decision"]) {
    assert(AWAITING_DECISION.has(status), status);
  }
  for (const status of ["applied", "planned_and_finished", "discarded", "errored", "canceled"]) {
    assert(FINISHED.has(status), status);
  }
  assert(!FINISHED.has("planning"), "a run that is still planning is not finished");
  assert(!AWAITING_DECISION.has("applied"), "an applied run is not waiting for anyone");
});

Deno.test("run-get: a run waiting for confirmation reports both flags", async () => {
  const { ctx } = mockCtx([run("planned", { "resource-additions": 1 })]);
  const result = await action.execute({ runId: "run-1" }, ctx) as Record<string, unknown>;
  assertEquals(result.awaitingDecision, true);
  assertEquals(result.finished, false);
  assertEquals(result.hasChanges, true);
});

Deno.test("run-get: a destructive plan is warned about", async () => {
  const { ctx, logs } = mockCtx([run("planned", { "resource-destructions": 4 })]);
  await action.execute({ runId: "run-1" }, ctx);
  assertEquals(logs[0].level, "warn");
  assertEquals(logs[0].data, { id: "run-1", destroys: 4 });

  const quiet = mockCtx([run("planned", { "resource-destructions": 0 })]);
  await action.execute({ runId: "run-1" }, quiet.ctx);
  assertEquals(quiet.logs.length, 0);
});

Deno.test("run-get: a run with no plan yet reports zeroes rather than undefined", async () => {
  const { ctx } = mockCtx([run("pending")]);
  const result = await action.execute({ runId: "run-1" }, ctx) as Record<string, unknown>;
  assertEquals(result.adds, 0);
  assertEquals(result.destroys, 0);
  assertEquals(result.plan, undefined);
});

Deno.test("run-get: a run id is required", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await action.execute({}, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/`runId` is required/.test(message), message);
  assertEquals(calls.length, 0);
});
