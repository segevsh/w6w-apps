import { assert, assertEquals } from "@std/assert";
import { mockNationBuilderCtx } from "../_helpers.ts";
import nation from "../../health/nation.ts";

/** An unsigned 401 from NationBuilder's documented error envelope has proved reachability. */
Deno.test("nation: an unsigned 401 is a pass, not an outage", async () => {
  const { ctx, calls } = mockNationBuilderCtx([{
    status: 401,
    body: { code: "unauthorized", message: "You are not authorized." },
  }]);
  const report = await nation.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(calls[0].url, "https://acme.nationbuilder.com/api/v2/signups/me");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(nation.kind, "dependency");
  assertEquals(nation.scope, "connection");
  assertEquals(nation.credential, "context");
});

Deno.test("nation: a 200 is also a pass", async () => {
  const { ctx } = mockNationBuilderCtx([{ status: 200, body: { data: {} } }]);
  assertEquals((await nation.check!({}, ctx)).state, "ok");
});

Deno.test("nation: a 404 is diagnosed as a missing/renamed nation", async () => {
  const { ctx } = mockNationBuilderCtx([{ status: 404, body: {} }]);
  const report = await nation.check!({}, ctx);
  assertEquals(report.state, "down");
  assert(report.message!.includes("not found"), report.message);
});

Deno.test("nation: a 5xx is down", async () => {
  const { ctx } = mockNationBuilderCtx([{ status: 503, body: "" }]);
  const report = await nation.check!({}, ctx);
  assertEquals(report.state, "down");
});

Deno.test("nation: a connection with no slug is unknown, not down", async () => {
  const { ctx } = mockNationBuilderCtx([]);
  (ctx as { connection?: unknown }).connection = { display: {} };
  const report = await nation.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message!.includes("no nation slug"), report.message);
});
