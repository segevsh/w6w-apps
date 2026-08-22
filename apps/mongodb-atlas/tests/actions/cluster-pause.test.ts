import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/cluster-pause.ts";

const state = (paused: boolean, stateName = "IDLE") => ({
  status: 200,
  body: { name: "prod", paused, stateName },
});

Deno.test("cluster-pause: reads the state, then PATCHes only `paused`", async () => {
  const { ctx, calls } = mockCtx([state(false), state(true, "UPDATING")]);
  const result = await action.execute(
    { projectId: "5f8d0d55b54eff0f2b2c3d4e", cluster: "prod" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls[1].method, "PATCH");
  assertEquals(JSON.parse(calls[1].body!), { paused: true });
  assertEquals(result.paused, true);
  assertEquals(result.changed, true);
  assertEquals(result.stateName, "UPDATING");
});

Deno.test("cluster-pause: resuming sends paused false", async () => {
  const { ctx, calls } = mockCtx([state(true), state(false, "UPDATING")]);
  const result = await action.execute(
    { projectId: "5f8d0d55b54eff0f2b2c3d4e", cluster: "prod", paused: false },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(JSON.parse(calls[1].body!), { paused: false });
  assertEquals(result.paused, false);
});

/** A scheduled pause hitting an already-paused cluster is not a failure. */
Deno.test("cluster-pause: an already-paused cluster is a no-op, not a 409", async () => {
  const { ctx, calls, logs } = mockCtx([state(true)]);
  const result = await action.execute(
    { projectId: "5f8d0d55b54eff0f2b2c3d4e", cluster: "prod" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls.length, 1, "no PATCH was sent");
  assertEquals(result.changed, false);
  assertEquals(result.paused, true);
  assert(/already paused/.test(logs[0].message), logs[0].message);
});

Deno.test("cluster-pause: an already-running cluster is a no-op for a resume", async () => {
  const { ctx, calls } = mockCtx([state(false)]);
  const result = await action.execute(
    { projectId: "5f8d0d55b54eff0f2b2c3d4e", cluster: "prod", paused: false },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls.length, 1);
  assertEquals(result.changed, false);
});

/** The 60-minute re-pause window and the 30-day auto-resume. */
Deno.test("cluster-pause: the description names both scheduling traps", () => {
  assert(/RESUMES a paused cluster after 30 days/.test(action.description!), action.description);
  assert(/60 minutes after it\s+resumes/.test(action.description!), action.description);
  assertEquals(action.idempotent, true);
});

Deno.test("cluster-pause: a 409 from Atlas surfaces with its explanation", async () => {
  const { ctx } = mockCtx([state(false), {
    status: 409,
    body: { detail: "Cannot pause cluster within 60 minutes of resuming" },
  }]);
  let message = "";
  try {
    await action.execute({ projectId: "5f8d0d55b54eff0f2b2c3d4e", cluster: "prod" }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/within 60 minutes/.test(message), message);
});

Deno.test("cluster-pause: a cluster name is required", async () => {
  const { ctx, calls } = mockCtx([]);
  let threw = false;
  try {
    await action.execute({ projectId: "5f8d0d55b54eff0f2b2c3d4e" }, ctx);
  } catch {
    threw = true;
  }
  assert(threw);
  assertEquals(calls.length, 0);
});
