import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/prediction-create.ts";

const VERSION = "5c7d5dc6dd8bf75c1acaa8565735e7986bc5b66206b55cca93cb72c9bf15ccaa";

Deno.test("prediction-create: POSTs the version and input", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "p1", status: "starting" } }]);
  await action.execute!({ version: VERSION, input: '{"text":"Alice"}' }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.replicate.com/v1/predictions");
  assertEquals(JSON.parse(calls[0].body!), { version: VERSION, input: { text: "Alice" } });
});

/** Without the wait header the response has no output at all. */
Deno.test("prediction-create: `starting` is neither finished nor succeeded", async () => {
  const { ctx } = mockCtx([{ status: 201, body: { id: "p1", status: "starting" } }]);
  const result = await action.execute!({ version: VERSION, input: "{}" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(result.finished, false);
  assertEquals(result.succeeded, false);
});

Deno.test("prediction-create: a succeeded prediction is both", async () => {
  const { ctx } = mockCtx([{
    status: 201,
    body: { id: "p1", status: "succeeded", output: ["hello"] },
  }]);
  const result = await action.execute!({ version: VERSION, input: "{}" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(result.finished, true);
  assertEquals(result.succeeded, true);
});

/** `failed` arrives with a 201 — no HTTP error anywhere. */
Deno.test("prediction-create: a failed prediction is finished but not succeeded", async () => {
  const { ctx } = mockCtx([{
    status: 201,
    body: { id: "p1", status: "failed", error: "input.prompt is required" },
  }]);
  const result = await action.execute!({ version: VERSION, input: "{}" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(result.finished, true);
  assertEquals(result.succeeded, false);
  assertEquals(result.error, "input.prompt is required");
});

Deno.test("prediction-create: the wait header is sent only when asked for", async () => {
  const without = mockCtx([{ status: 201, body: {} }]);
  await action.execute!({ version: VERSION, input: "{}" }, without.ctx);
  assertEquals(without.calls[0].headers["prefer"], undefined);

  const withWait = mockCtx([{ status: 201, body: {} }]);
  await action.execute!({ version: VERSION, input: "{}", waitSeconds: 30 }, withWait.ctx);
  assertEquals(withWait.calls[0].headers["prefer"], "wait=30");
});

/** A model name here is a different endpoint's job, and easy to confuse. */
Deno.test("prediction-create: a model name in the version field is caught locally", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(
    async () => await action.execute!({ version: "acme/thing", input: "{}" }, ctx),
    Error,
  );
  assert(err.message.includes("takes a pinned version id"), err.message);
  assertEquals(calls.length, 0);
});

Deno.test("prediction-create: a pinned owner/name:version is accepted", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await action.execute!({ version: `acme/thing:${VERSION}`, input: "{}" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).version, `acme/thing:${VERSION}`);
});

Deno.test("prediction-create: webhook events are comma-split", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await action.execute!({
    version: VERSION,
    input: "{}",
    webhook: "https://hooks.example.com/x",
    webhookEventsFilter: "start, completed",
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.webhook, "https://hooks.example.com/x");
  assertEquals(body.webhook_events_filter, ["start", "completed"]);
});

Deno.test("prediction-create: version and a JSON-object input are both required", async () => {
  const noVersion = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ input: "{}" }, noVersion.ctx),
    Error,
    "`version` is required",
  );
  const badInput = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ version: VERSION, input: "[1,2]" }, badInput.ctx),
    Error,
    "`input` is required",
  );
  assertEquals(noVersion.calls.length + badInput.calls.length, 0);
  assertEquals(action.idempotent, false);
});
