import { assertEquals } from "@std/assert";
import { mockCtx, mockSupabaseCtx } from "../_helpers.ts";
import reachable from "../../health/reachable.ts";

Deno.test("reachable: no projectUrl on the connection reports unknown", async () => {
  const { ctx } = mockCtx();
  const report = await reachable.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("reachable: a 401 (no apikey header sent) still counts as reachable", async () => {
  const { ctx, calls } = mockSupabaseCtx([{
    status: 401,
    body: { message: "No API key found in request" },
  }]);
  const report = await reachable.check!({}, ctx);
  assertEquals(calls[0].url, "https://abcdefgh.supabase.co/rest/v1/");
  assertEquals("apikey" in calls[0].headers, false);
  assertEquals(report.state, "ok");
});

Deno.test("reachable: a 200 is also ok", async () => {
  const { ctx } = mockSupabaseCtx([{ status: 200, body: { swagger: "2.0" } }]);
  const report = await reachable.check!({}, ctx);
  assertEquals(report.state, "ok");
});

Deno.test("reachable: a 404 means the project was paused or deleted", async () => {
  const { ctx } = mockSupabaseCtx([{ status: 404 }]);
  const report = await reachable.check!({}, ctx);
  assertEquals(report.state, "down");
});

Deno.test("reachable: a 5xx is down", async () => {
  const { ctx } = mockSupabaseCtx([{ status: 503 }]);
  const report = await reachable.check!({}, ctx);
  assertEquals(report.state, "down");
});
