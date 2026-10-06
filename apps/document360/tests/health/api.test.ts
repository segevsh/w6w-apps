import { assertEquals } from "@std/assert";
import api from "../../health/api.ts";
import { EU, mockCtx, problem, PROBLEM_HEADERS, US } from "../_helpers.ts";

const run = (ctx: Parameters<NonNullable<typeof api.check>>[1]) => api.check!({}, ctx);

Deno.test("api: the gateway's empty 401 with www-authenticate: Bearer passes", async () => {
  const { ctx, calls } = mockCtx([{
    status: 401,
    body: "",
    headers: { "www-authenticate": "Bearer" },
  }]);
  const r = await run(ctx);
  assertEquals(r.state, "ok");
  assertEquals(calls[0].url.startsWith(EU), true);
  assertEquals(calls[0].headers["x-api-key"], undefined);
});

Deno.test("api: probes the Connection's own region", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 401, body: "", headers: { "www-authenticate": "Bearer" } }],
    { region: "us" },
  );
  await run(ctx);
  assertEquals(calls[0].url.startsWith(US), true);
});

Deno.test("api: a problem+json body passes, whatever the status", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    headers: PROBLEM_HEADERS,
    body: problem(403, "FORBIDDEN", "x"),
  }]);
  assertEquals((await run(ctx)).state, "ok");
});

Deno.test("api: a 2xx passes", async () => {
  const { ctx } = mockCtx([{ body: { success: true, data: [] } }]);
  assertEquals((await run(ctx)).state, "ok");
});

Deno.test("api: a 5xx is down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  assertEquals((await run(ctx)).state, "down");
});

Deno.test("api: an HTML shell is down, never ok", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: "<!DOCTYPE html><html></html>",
    headers: { "content-type": "text/html" },
  }]);
  assertEquals((await run(ctx)).state, "down");
});

Deno.test("api: an empty non-401 body and an unrecognised JSON body are unknown", async () => {
  assertEquals((await run(mockCtx([{ status: 404, body: "" }]).ctx)).state, "unknown");
  assertEquals((await run(mockCtx([{ status: 404, body: { hello: 1 } }]).ctx)).state, "unknown");
  assertEquals(
    (await run(
      mockCtx([{ status: 404, body: "not json", headers: { "content-type": "text/plain" } }]).ctx,
    )).state,
    "unknown",
  );
});

Deno.test("api: declares an unsigned, connection-scoped dependency check", () => {
  assertEquals(api.kind, "dependency");
  assertEquals(api.scope, "connection");
  assertEquals(api.credential, "context");
});
