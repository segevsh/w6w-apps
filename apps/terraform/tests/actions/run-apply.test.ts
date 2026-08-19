import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/run-apply.ts";

const run = (status: string, plan: Record<string, unknown> = {}) => ({
  status: 200,
  body: {
    data: {
      type: "runs",
      id: "run-1",
      attributes: { status },
      relationships: { plan: { data: { type: "plans", id: "plan-1" } } },
    },
    included: [{ type: "plans", id: "plan-1", attributes: plan }],
  },
});

const additive = run("planned", { "resource-additions": 2, "resource-changes": 1 });

/** "Apply whatever this is" is not a thing to offer. */
Deno.test("run-apply: reads the run and its plan before confirming anything", async () => {
  const { ctx, calls } = mockCtx([additive, { status: 202, body: {} }]);
  const result = await action.execute({ runId: "run-1" }, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).searchParams.get("include"), "plan");
  assertEquals(calls[1].url, "https://app.terraform.io/api/v2/runs/run-1/actions/apply");
  assertEquals(calls[1].method, "POST");
  assertEquals(result.applied, true);
  assertEquals(result.adds, 2);
  assertEquals(result.changes, 1);
});

/**
 * Every other write in this API needs the JSON:API envelope; the action
 * endpoints take a bare object and silently drop a wrapped comment.
 */
Deno.test("run-apply: sends a bare comment body, not a JSON:API document", async () => {
  const { ctx, calls } = mockCtx([additive, { status: 202, body: {} }]);
  await action.execute({ runId: "run-1", comment: "shipped by CI" }, ctx);
  const body = JSON.parse(calls[1].body!);
  assertEquals(body, { comment: "shipped by CI" });
  assertEquals(body.data, undefined);
});

/** A replaced resource is one destruction and one addition. */
Deno.test("run-apply: refuses a destructive plan without the count acknowledged", async () => {
  const { ctx, calls } = mockCtx([run("planned", { "resource-destructions": 3 })]);
  let message = "";
  try {
    await action.execute({ runId: "run-1" }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/destroys 3 resource\(s\)/.test(message), message);
  assert(/Set it to 3 to proceed/.test(message), message);
  assert(/REPLACED resource counts as one destruction/.test(message), message);
  assertEquals(calls.length, 1, "nothing was applied");
});

Deno.test("run-apply: the acknowledgement must equal the count, not merely exceed it", async () => {
  for (const acknowledged of [2, 4]) {
    const { ctx, calls } = mockCtx([run("planned", { "resource-destructions": 3 })]);
    let threw = false;
    try {
      await action.execute({ runId: "run-1", acknowledgeDestroys: acknowledged }, ctx);
    } catch {
      threw = true;
    }
    assert(threw, `${acknowledged} was accepted for a plan destroying 3`);
    assertEquals(calls.length, 1);
  }

  const exact = mockCtx([run("planned", { "resource-destructions": 3 }), {
    status: 202,
    body: {},
  }]);
  const result = await action.execute(
    { runId: "run-1", acknowledgeDestroys: 3 },
    exact.ctx,
  ) as Record<string, unknown>;
  assertEquals(result.applied, true);
  assertEquals(result.destroys, 3);
});

/** An additive plan is not gated — the destruction count is the risk. */
Deno.test("run-apply: a plan that destroys nothing applies without an acknowledgement", async () => {
  const { ctx } = mockCtx([additive, { status: 202, body: {} }]);
  const result = await action.execute({ runId: "run-1" }, ctx) as Record<string, unknown>;
  assertEquals(result.applied, true);
  assertEquals(result.destroys, 0);
});

Deno.test("run-apply: planned_and_finished explains there is nothing to apply", async () => {
  const { ctx, calls } = mockCtx([run("planned_and_finished")]);
  let message = "";
  try {
    await action.execute({ runId: "run-1" }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/the plan found no changes, or the run was plan-only/.test(message), message);
  assertEquals(calls.length, 1);
});

Deno.test("run-apply: a run in any other state is refused with what state it is in", async () => {
  for (
    const [status, expected] of [
      ["applied", /already been applied/],
      ["planning", /awaiting confirmation/],
      ["discarded", /awaiting confirmation/],
    ] as Array<[string, RegExp]>
  ) {
    const { ctx, calls } = mockCtx([run(status)]);
    let message = "";
    try {
      await action.execute({ runId: "run-1" }, ctx);
    } catch (err) {
      message = String(err);
    }
    assert(new RegExp(`is \\\`${status}\\\``).test(message), message);
    assert(expected.test(message), message);
    assertEquals(calls.length, 1);
  }
});

/** A Sentinel soft-failure is the other applyable state. */
Deno.test("run-apply: policy_override is applyable", async () => {
  const { ctx } = mockCtx([run("policy_override"), { status: 202, body: {} }]);
  const result = await action.execute({ runId: "run-1" }, ctx) as Record<string, unknown>;
  assertEquals(result.applied, true);
  assertEquals(result.status, "policy_override");
});

/** For an apply nobody watched, the comment is the only record of why. */
Deno.test("run-apply: warns that infrastructure is changing, with the counts", async () => {
  const { ctx, logs } = mockCtx([
    run("planned", { "resource-additions": 1, "resource-destructions": 2 }),
    { status: 202, body: {} },
  ]);
  await action.execute({ runId: "run-1", acknowledgeDestroys: 2 }, ctx);
  assertEquals(logs[0].level, "warn");
  assert(/infrastructure is being changed/.test(logs[0].message), logs[0].message);
  assertEquals(logs[0].data, { id: "run-1", adds: 1, changes: 0, destroys: 2 });
});

Deno.test("run-apply: a run id is required", async () => {
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
