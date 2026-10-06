import { assertEquals } from "@std/assert";
import api from "../../health/api.ts";
import { mockCtx } from "../_helpers.ts";

// deno-lint-ignore no-explicit-any
const run = (ctx: any, region?: string) =>
  // deno-lint-ignore no-explicit-any
  api.check!({} as any, { ...ctx, connection: region ? { display: { region } } : undefined });

const authErr = { error: "Missing API key" };

Deno.test("api: the documented 401 {error} answer is healthy, sent unsigned", async () => {
  const { ctx, calls } = mockCtx([{ status: 401, body: authErr }]);
  assertEquals((await run(ctx)).state, "ok");
  assertEquals(calls[0].url, "https://public-api.ringover.com/v2/teams");
  assertEquals("authorization" in calls[0].headers, false);
});

Deno.test("api: probes the connection's region host", async () => {
  const { ctx, calls } = mockCtx([{ status: 401, body: authErr }]);
  await run(ctx, "us");
  assertEquals(calls[0].url, "https://public-api-us.ringover.com/v2/teams");
});

Deno.test("api: 5xx is down; an HTML 200 and a text 404 are degraded", async () => {
  assertEquals((await run(mockCtx([{ status: 502, body: "bad gateway" }]).ctx)).state, "down");
  assertEquals(
    (await run(mockCtx([{ status: 200, body: "<html></html>" }]).ctx)).state,
    "degraded",
  );
  const nf = mockCtx([{ status: 404, body: "404 page not found" }]);
  assertEquals((await run(nf.ctx)).state, "degraded");
});

Deno.test("api: an unreachable host is down", async () => {
  assertEquals((await run(mockCtx([]).ctx)).state, "down");
});
