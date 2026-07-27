import { assertEquals, assertRejects } from "@std/assert";
import { compact, INTERCOM_VERSION, IntercomClient } from "../../lib/client.ts";

import { mockCtx } from "../_helpers.ts";

Deno.test("client: sends accept + intercom-version on every request, never Authorization", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new IntercomClient(ctx).request("/me");
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["intercom-version"], INTERCOM_VERSION);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("client: 204 returns undefined without parsing a body", async () => {
  const { ctx } = mockCtx([{ status: 204, headers: {} }]);
  const result = await new IntercomClient(ctx).request("/contacts/x");
  assertEquals(result, undefined);
});

Deno.test("client: throws a descriptive Error on non-2xx", async () => {
  const { ctx } = mockCtx([
    { status: 404, statusText: "Not Found", body: '{"type":"error.list"}' },
  ]);
  const client = new IntercomClient(ctx);
  const err = await assertRejects(
    () => client.request("/contacts/missing"),
    Error,
    "Intercom 404",
  );
  assertEquals(err.message.includes("/contacts/missing"), true);
});

Deno.test("client: skips null/undefined/empty query params", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new IntercomClient(ctx).request("/companies", {
    query: { a: "kept", b: undefined, c: null, d: "" },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("a"), "kept");
  assertEquals(url.searchParams.has("b"), false);
  assertEquals(url.searchParams.has("c"), false);
  assertEquals(url.searchParams.has("d"), false);
});

Deno.test("client: JSON body sets content-type and serializes", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  await new IntercomClient(ctx).request("/contacts", {
    method: "POST",
    body: { email: "a@b.com" },
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { email: "a@b.com" });
});

Deno.test("client: passes an absolute URL through unchanged", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new IntercomClient(ctx).request("https://example.internal/foo?x=1");
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://example.internal");
  assertEquals(url.pathname, "/foo");
});

Deno.test("compact: drops undefined/null/empty and keeps 0 and false", () => {
  assertEquals(
    compact({ a: 0, b: false, c: "", d: null, e: undefined, f: "x" }),
    { a: 0, b: false, f: "x" },
  );
});
