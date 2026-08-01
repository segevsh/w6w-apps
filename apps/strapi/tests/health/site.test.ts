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

Deno.test("site: ok on 204 from GET /_health", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }], {
    display: { endpoint: "https://example.com" },
  });
  const result = await site.check!({}, ctx);
  assertEquals(result.state, "ok");
  assertEquals(calls[0].url, "https://example.com/_health");
  assertEquals(calls[0].method, "GET");
});

Deno.test("site: down on 404 (not Strapi-shaped)", async () => {
  const { ctx } = mockCtx([{ status: 404, body: "" }], {
    display: { endpoint: "https://example.com" },
  });
  const result = await site.check!({}, ctx);
  assertEquals(result.state, "down");
});

Deno.test("site: down on 5xx", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }], {
    display: { endpoint: "https://example.com" },
  });
  const result = await site.check!({}, ctx);
  assertEquals(result.state, "down");
});

Deno.test("site: trims a trailing slash from the endpoint before probing", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }], {
    display: { endpoint: "https://example.com/" },
  });
  await site.check!({}, ctx);
  assertEquals(calls[0].url, "https://example.com/_health");
});
