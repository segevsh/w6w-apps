import { assertEquals } from "@std/assert";
import api from "../../health/api.ts";
import { mockCtx } from "../_helpers.ts";

// deno-lint-ignore no-explicit-any
const run = (ctx: any, region?: string) =>
  // deno-lint-ignore no-explicit-any
  api.check!({} as any, { ...ctx, connection: region ? { display: { region } } : undefined });

const authErr = {
  code: "not_authenticated",
  detail: "Authentication credentials were not provided.",
};

Deno.test("api: the documented 401 authentication error is healthy, sent unsigned", async () => {
  const { ctx, calls } = mockCtx([{ status: 401, body: authErr }]);
  assertEquals((await run(ctx)).state, "ok");
  assertEquals(calls[0].url, "https://us-west-2.recall.ai/api/v1/bot/");
  assertEquals("authorization" in calls[0].headers, false);
  assertEquals(calls[0].body, null);
});

Deno.test("api: probes the connection's region host", async () => {
  const { ctx, calls } = mockCtx([{ status: 401, body: authErr }]);
  await run(ctx, "ap-northeast-1");
  assertEquals(calls[0].url, "https://ap-northeast-1.recall.ai/api/v1/bot/");
});

Deno.test("api: 5xx is down, an HTML 200 is degraded, other errors are degraded", async () => {
  assertEquals((await run(mockCtx([{ status: 502, body: "bad gateway" }]).ctx)).state, "down");
  assertEquals(
    (await run(mockCtx([{ status: 200, body: "<html></html>" }]).ctx)).state,
    "degraded",
  );
  const nf = mockCtx([{ status: 404, body: { code: "not_found", detail: "nope" } }]);
  assertEquals((await run(nf.ctx)).state, "degraded");
  // an empty ad-hoc pool (507) is capacity, not an outage of the API
  const full = mockCtx([{ status: 507, body: { detail: "Out of adhoc bots" } }]);
  assertEquals((await run(full.ctx)).state, "degraded");
});

Deno.test("api: an unreachable host is down", async () => {
  assertEquals((await run(mockCtx([]).ctx)).state, "down");
});
