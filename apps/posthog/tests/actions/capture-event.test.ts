import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/capture-event.ts";

function baseInput(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    projectApiKey: "phc_public_token",
    event: "signed_up",
    distinctId: "user-1",
    ...overrides,
  };
}

Deno.test("capture-event: does not require a Connection", () => {
  assertEquals(action.requiresAuth, false);
});

Deno.test("capture-event: POSTs to /i/v0/e/ on the US ingestion host by default", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { status: 1 } }]);
  const result = await action.execute!(baseInput(), ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].url, "https://us.i.posthog.com/i/v0/e/");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.api_key, "phc_public_token");
  assertEquals(body.event, "signed_up");
  assertEquals(body.distinct_id, "user-1");
  assertEquals(result, { status: 200, response: { status: 1 } });
});

Deno.test("capture-event: honors region — routes to the EU ingestion host", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!(baseInput({ region: "eu" }), ctx);
  assertEquals(calls[0].url, "https://eu.i.posthog.com/i/v0/e/");
});

Deno.test("capture-event: never sends an Authorization header (no stored credential)", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!(baseInput(), ctx);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("capture-event: properties and timestamp are passed through", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!(
    baseInput({ properties: { plan: "pro" }, timestamp: "2026-08-01T00:00:00Z" }),
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.properties, { plan: "pro" });
  assertEquals(body.timestamp, "2026-08-01T00:00:00Z");
});

Deno.test("capture-event: missing required fields reject with informative errors", async () => {
  const cases: Array<[string, Record<string, unknown>]> = [
    ["projectApiKey", { projectApiKey: "" }],
    ["event", { event: "" }],
    ["distinctId", { distinctId: "" }],
  ];
  for (const [field, patch] of cases) {
    const { ctx } = mockCtx();
    await assertRejects(
      async () => await action.execute!(baseInput(patch), ctx),
      Error,
      `\`${field}\``,
    );
  }
});

Deno.test("capture-event: non-2xx response propagates as Error", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { error: "bad api_key" } }]);
  const err = await assertRejects(
    async () => await action.execute!(baseInput(), ctx),
    Error,
    "returned 400",
  );
  assertEquals(err.message.includes("bad api_key"), true);
});
