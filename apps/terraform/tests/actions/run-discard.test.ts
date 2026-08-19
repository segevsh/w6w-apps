import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/run-discard.ts";

const run = (status: string) => ({
  status: 200,
  body: { data: { type: "runs", id: "run-1", attributes: { status } } },
});

Deno.test("run-discard: reads the run, then posts a bare comment to the discard action", async () => {
  const { ctx, calls } = mockCtx([run("planned"), { status: 202, body: {} }]);
  const result = await action.execute(
    { runId: "run-1", comment: "superseded" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls[1].url, "https://app.terraform.io/api/v2/runs/run-1/actions/discard");
  assertEquals(JSON.parse(calls[1].body!), { comment: "superseded" });
  assertEquals(result.discarded, true);
  assertEquals(result.status, "planned");
});

/** Discarding changes no infrastructure — the plan was only a proposal. */
Deno.test("run-discard: logs at info, not warn", async () => {
  const { ctx, logs } = mockCtx([run("planned"), { status: 202, body: {} }]);
  await action.execute({ runId: "run-1" }, ctx);
  assertEquals(logs[0].level, "info");
  assert(/releasing its workspace/.test(logs[0].message), logs[0].message);
});

Deno.test("run-discard: the comment defaults rather than being sent blank", async () => {
  const { ctx, calls } = mockCtx([run("planned"), { status: 202, body: {} }]);
  await action.execute({ runId: "run-1", comment: "  " }, ctx);
  assertEquals(JSON.parse(calls[1].body!).comment, "Discarded by a w6w workflow");
});

/** Their plans were computed against a state this one would have changed. */
Deno.test("run-discard: says it also discards the runs queued behind it", () => {
  assert(/ALSO discards any runs queued behind it/.test(action.description!), action.description);
  assertEquals(action.idempotent, true);
});

Deno.test("run-discard: a run that cannot be discarded surfaces the conflict", async () => {
  const { ctx } = mockCtx([run("applied"), {
    status: 409,
    body: { errors: [{ title: "conflict", detail: "run is not discardable" }] },
  }]);
  let message = "";
  try {
    await action.execute({ runId: "run-1" }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/not discardable/.test(message), message);
  assert(/already been applied, discarded or cancelled/.test(message), message);
});

Deno.test("run-discard: a run id is required", async () => {
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
