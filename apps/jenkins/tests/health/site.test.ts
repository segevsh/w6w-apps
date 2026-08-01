import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import site from "../../health/site.ts";

Deno.test("site: dependency / connection / context posture", () => {
  assertEquals(site.kind, "dependency");
  assertEquals(site.scope, "connection");
  assertEquals(site.credential, "context");
});

Deno.test("site: unknown when the connection records no endpoint", async () => {
  const { ctx, calls } = mockCtx();
  const result = await site.check!({}, ctx);
  assertEquals(result.state, "unknown");
  assertEquals(calls.length, 0);
});

Deno.test("site: ok on a plain 200 from GET /api/json", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { jobs: [] } }], {
    display: { endpoint: "https://ci.example.com" },
  });
  const result = await site.check!({}, ctx);
  assertEquals(result.state, "ok");
  assertEquals(calls[0].url, "https://ci.example.com/api/json");
  assertEquals(calls[0].method, "GET");
});

Deno.test("site: 401 counts as reachable (security enabled, instance IS up)", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "" }], {
    display: { endpoint: "https://ci.example.com" },
  });
  const result = await site.check!({}, ctx);
  assertEquals(result.state, "ok");
});

Deno.test("site: 403 also counts as reachable", async () => {
  const { ctx } = mockCtx([{ status: 403, body: "" }], {
    display: { endpoint: "https://ci.example.com" },
  });
  const result = await site.check!({}, ctx);
  assertEquals(result.state, "ok");
});

Deno.test("site: down on 404 (not Jenkins-shaped)", async () => {
  const { ctx } = mockCtx([{ status: 404, body: "" }], {
    display: { endpoint: "https://ci.example.com" },
  });
  const result = await site.check!({}, ctx);
  assertEquals(result.state, "down");
});

Deno.test("site: down on 5xx", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }], {
    display: { endpoint: "https://ci.example.com" },
  });
  const result = await site.check!({}, ctx);
  assertEquals(result.state, "down");
});

Deno.test("site: trims a trailing slash from the endpoint before probing", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], {
    display: { endpoint: "https://ci.example.com/" },
  });
  await site.check!({}, ctx);
  assertEquals(calls[0].url, "https://ci.example.com/api/json");
});
