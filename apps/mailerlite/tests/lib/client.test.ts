import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { API_URL, MailerLiteClient } from "../../lib/client.ts";

Deno.test("client: targets the current connect.mailerlite.com API, not Classic", () => {
  assertEquals(API_URL, "https://connect.mailerlite.com/api");
});

Deno.test("client: resolves a relative path against the API base", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await new MailerLiteClient(ctx).request("/subscribers");
  const url = new URL(calls[0].url);
  assertEquals(url.hostname, "connect.mailerlite.com");
  assertEquals(url.pathname, "/api/subscribers");
});

Deno.test("client: tolerates a path without a leading slash", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new MailerLiteClient(ctx).request("groups");
  assertEquals(new URL(calls[0].url).pathname, "/api/groups");
});

Deno.test("client: 204 returns undefined without parsing a body", async () => {
  const { ctx } = mockCtx([{ status: 204, headers: {} }]);
  const result = await new MailerLiteClient(ctx).request("/subscribers/x");
  assertEquals(result, undefined);
});

Deno.test("client: an empty 200 body returns undefined", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "" }]);
  const result = await new MailerLiteClient(ctx).request("/subscribers/x");
  assertEquals(result, undefined);
});

Deno.test("client: throws a descriptive Error on non-2xx", async () => {
  const { ctx } = mockCtx([
    {
      status: 422,
      statusText: "Unprocessable Entity",
      body: '{"message":"The given data was invalid."}',
    },
  ]);
  const err = await assertRejects(
    () => new MailerLiteClient(ctx).request("/subscribers", { method: "POST", body: {} }),
    Error,
    "MailerLite 422",
  );
  assertEquals(err.message.includes("/api/subscribers"), true);
  assertEquals(err.message.includes("The given data was invalid."), true);
});

Deno.test("client: skips null/undefined/empty query params but keeps 0", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new MailerLiteClient(ctx).request("/x", {
    query: { a: "kept", b: undefined, c: null, d: "", limit: 0 },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("a"), "kept");
  assertEquals(url.searchParams.has("b"), false);
  assertEquals(url.searchParams.has("c"), false);
  assertEquals(url.searchParams.has("d"), false);
  assertEquals(url.searchParams.get("limit"), "0");
});

Deno.test("client: passes bracketed filter keys through intact", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new MailerLiteClient(ctx).request("/subscribers", {
    query: { "filter[status]": "active" },
  });
  assertEquals(new URL(calls[0].url).searchParams.get("filter[status]"), "active");
});

Deno.test("client: passes an absolute URL through unchanged", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new MailerLiteClient(ctx).request("https://example.internal/foo?x=1");
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://example.internal");
  assertEquals(url.pathname, "/foo");
});

Deno.test("client: sends a JSON body with a content-type header", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "1" } } }]);
  await new MailerLiteClient(ctx).request("/groups", { method: "POST", body: { name: "x" } });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, JSON.stringify({ name: "x" }));
});

Deno.test("client: always asks for JSON and never sets a credential header", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new MailerLiteClient(ctx).request("/subscribers");
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("client: returns the {data, links, meta} envelope verbatim", async () => {
  const envelope = {
    data: [{ id: "1" }],
    links: { next: "https://connect.mailerlite.com/api/subscribers?cursor=abc" },
    meta: { next_cursor: "abc", per_page: 25 },
  };
  const { ctx } = mockCtx([{ body: envelope }]);
  const out = await new MailerLiteClient(ctx).request("/subscribers");
  assertEquals(out, envelope);
});
