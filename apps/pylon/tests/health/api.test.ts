import { assertEquals } from "@std/assert";
import api from "../../health/api.ts";
import { mockCtx } from "../_helpers.ts";

// deno-lint-ignore no-explicit-any
const run = (ctx: any, region?: string) =>
  // deno-lint-ignore no-explicit-any
  api.check!({} as any, { ...ctx, connection: region ? { display: { region } } : undefined });

const authErr = { errors: ["Token must follow Bearer"], code: "invalid_authorization_header" };

Deno.test("api: the documented 401 authentication error is healthy, sent unsigned", async () => {
  const { ctx, calls } = mockCtx([{ status: 401, body: authErr }]);
  assertEquals((await run(ctx)).state, "ok");
  assertEquals(calls[0].url, "https://api.usepylon.com/me");
  assertEquals("authorization" in calls[0].headers, false);
});

Deno.test("api: probes the connection's region host", async () => {
  const { ctx, calls } = mockCtx([{ status: 401, body: authErr }]);
  await run(ctx, "eu");
  assertEquals(calls[0].url, "https://api.eu.usepylon.com/me");
});

Deno.test("api: 5xx is down, an HTML 200 is degraded, other errors are degraded", async () => {
  assertEquals((await run(mockCtx([{ status: 502, body: "bad gateway" }]).ctx)).state, "down");
  assertEquals(
    (await run(mockCtx([{ status: 200, body: "<html></html>" }]).ctx)).state,
    "degraded",
  );
  const nf = mockCtx([{ status: 404, body: { errors: ["nope"], code: "not_found" } }]);
  assertEquals((await run(nf.ctx)).state, "degraded");
});

Deno.test("api: an unreachable host is down", async () => {
  assertEquals((await run(mockCtx([]).ctx)).state, "down");
});
