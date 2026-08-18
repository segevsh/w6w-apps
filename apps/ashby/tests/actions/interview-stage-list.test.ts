import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/interview-stage-list.ts";

const ok = (results: unknown) => ({ status: 200, body: { success: true, results } });

/**
 * Moving into a stage typed `Archived` is a rejection, so a workflow picking a
 * stage by name can reject somebody while believing it advanced them.
 */
Deno.test("interview-stage-list: separates the stages that reject from those that advance", async () => {
  const { ctx, calls } = mockCtx([ok([
    { id: "s1", title: "Recruiter Screen", type: "Active" },
    { id: "s2", title: "Rejected", type: "Archived" },
  ])]);
  const result = await action.execute!({ interviewPlanId: "plan_1" }, ctx) as {
    count: number;
    archiveStages: Array<{ id: string; title: string }>;
  };
  assertEquals(calls[0].url, "https://api.ashbyhq.com/interviewStage.list");
  assertEquals(JSON.parse(calls[0].body!), { interviewPlanId: "plan_1" });
  assertEquals(result.count, 2);
  assertEquals(result.archiveStages, [{ id: "s2", title: "Rejected" }]);
});

Deno.test("interview-stage-list: a plan with no archive stage reports an empty list", async () => {
  const { ctx } = mockCtx([ok([{ id: "s1", type: "Active" }])]);
  const result = await action.execute!({ interviewPlanId: "plan_1" }, ctx) as {
    archiveStages: unknown[];
  };
  assertEquals(result.archiveStages, []);
});

Deno.test("interview-stage-list: needs a plan id", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(async () => await action.execute!({}, ctx), Error, "interviewPlanId");
  assertEquals(calls.length, 0);
});

/** Stages are per plan, so hard-coding an id works for exactly one role. */
Deno.test("interview-stage-list: warns that stage ids are per interview plan", () => {
  const p = (action.params as Array<{ key: string; hint?: string }>)
    .find((p) => p.key === "interviewPlanId")!;
  assert(/different ids/.test(p.hint!), p.hint);
});
