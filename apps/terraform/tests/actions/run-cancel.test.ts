import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/run-cancel.ts";

const run = (status: string, forceCancelable = false) => ({
  status: 200,
  body: {
    data: {
      type: "runs",
      id: "run-1",
      attributes: { status, "is-force-cancelable": forceCancelable },
    },
  },
});

Deno.test("run-cancel: posts to the ordinary cancel action with a bare comment", async () => {
  const { ctx, calls } = mockCtx([run("planning"), { status: 202, body: {} }]);
  const result = await action.execute({ runId: "run-1" }, ctx) as Record<string, unknown>;
  assertEquals(calls[1].url, "https://app.terraform.io/api/v2/runs/run-1/actions/cancel");
  assertEquals(JSON.parse(calls[1].body!).comment, "Cancelled by a w6w workflow");
  assertEquals(result.cancelled, true);
  assertEquals(result.forced, false);
  assertEquals(result.wasApplying, false);
});

/** An interrupted apply leaves resources that exist and are not in state. */
Deno.test("run-cancel: forcing needs an acknowledgement, and nothing is sent without it", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await action.execute({ runId: "run-1", force: true }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/set `confirmForce`/.test(message), message);
  assert(/not in the state file/.test(message), message);
  assertEquals(calls.length, 0, "the run was not even read");
});

/** HCP Terraform requires an ordinary cancel first and a cool-down after it. */
Deno.test("run-cancel: refuses to force before the API would allow it", async () => {
  const { ctx, calls } = mockCtx([run("applying", false)]);
  let message = "";
  try {
    await action.execute({ runId: "run-1", force: true, confirmForce: true }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/not force-cancelable yet/.test(message), message);
  assert(/Cancel without `force`, wait, then try again/.test(message), message);
  assertEquals(calls.length, 1);
});

Deno.test("run-cancel: an allowed force uses the force-cancel endpoint", async () => {
  const { ctx, calls } = mockCtx([run("applying", true), { status: 202, body: {} }]);
  const result = await action.execute(
    { runId: "run-1", force: true, confirmForce: true },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls[1].url, "https://app.terraform.io/api/v2/runs/run-1/actions/force-cancel");
  assertEquals(result.forced, true);
  assertEquals(result.wasApplying, true);
});

/** The dangerous case is specifically a run in `applying`. */
Deno.test("run-cancel: only a force-cancelled apply warns about state", async () => {
  const applying = mockCtx([run("applying", true), { status: 202, body: {} }]);
  await action.execute({ runId: "run-1", force: true, confirmForce: true }, applying.ctx);
  assertEquals(applying.logs[0].level, "warn");
  assert(
    /state may no longer match reality/.test(applying.logs[0].message),
    applying.logs[0].message,
  );

  const planning = mockCtx([run("planning", true), { status: 202, body: {} }]);
  await action.execute({ runId: "run-1", force: true, confirmForce: true }, planning.ctx);
  assertEquals(planning.logs[0].level, "info");

  const polite = mockCtx([run("applying"), { status: 202, body: {} }]);
  await action.execute({ runId: "run-1" }, polite.ctx);
  assertEquals(polite.logs[0].level, "info");
});

Deno.test("run-cancel: a run id is required", async () => {
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

Deno.test("run-cancel: the description contrasts the two", () => {
  assert(/FORCE kills it instead of stopping safely/.test(action.description!), action.description);
  assertEquals(action.idempotent, true);
});
