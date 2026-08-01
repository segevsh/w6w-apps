import { assertEquals } from "@std/assert";
import { mockCtx, mockUpstashCtx } from "../_helpers.ts";
import host from "../../health/host.ts";

Deno.test("host: unauthenticated 401 -> ok (host is answering)", async () => {
  const { ctx, calls } = mockUpstashCtx([{
    status: 401,
    body: { error: "WRONGPASS invalid password" },
  }]);
  const report = await host.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(calls[0].url, "https://usw1-example-12345.upstash.io/ping");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("host: 404 -> down", async () => {
  const { ctx } = mockUpstashCtx([{ status: 404, body: undefined }]);
  const report = await host.check!({}, ctx);
  assertEquals(report.state, "down");
});

Deno.test("host: 5xx -> down", async () => {
  const { ctx } = mockUpstashCtx([{ status: 503, body: undefined }]);
  const report = await host.check!({}, ctx);
  assertEquals(report.state, "down");
});

Deno.test("host: no connection recorded -> unknown", async () => {
  const { ctx } = mockCtx([]);
  const report = await host.check!({}, ctx);
  assertEquals(report.state, "unknown");
});
