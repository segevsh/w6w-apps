import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { API_URL, ConstantContactClient, nextCursor } from "../../lib/client.ts";

Deno.test("client: targets the V3 API host, not the V2 one", () => {
  assertEquals(API_URL, "https://api.cc.email/v3");
});

Deno.test("client: resolves a relative path against the API base", async () => {
  const { ctx, calls } = mockCtx([{ body: { contacts: [] } }]);
  await new ConstantContactClient(ctx).request("/contacts");
  const url = new URL(calls[0].url);
  assertEquals(url.hostname, "api.cc.email");
  assertEquals(url.pathname, "/v3/contacts");
});

Deno.test("client: tolerates a path without a leading slash", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new ConstantContactClient(ctx).request("contact_lists");
  assertEquals(new URL(calls[0].url).pathname, "/v3/contact_lists");
});

Deno.test("client: 204 returns undefined without parsing a body", async () => {
  const { ctx } = mockCtx([{ status: 204, headers: {} }]);
  assertEquals(await new ConstantContactClient(ctx).request("/contacts/x"), undefined);
});

Deno.test("client: an empty 200 body returns undefined", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "" }]);
  assertEquals(await new ConstantContactClient(ctx).request("/contacts/x"), undefined);
});

Deno.test("client: throws a descriptive Error on non-2xx", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    statusText: "Bad Request",
    body: '[{"error_key":"invalid.email","error_message":"not an email"}]',
  }]);
  const err = await assertRejects(
    () => new ConstantContactClient(ctx).request("/contacts", { method: "POST", body: {} }),
    Error,
    "Constant Contact 400",
  );
  assertEquals(err.message.includes("/v3/contacts"), true);
  assertEquals(err.message.includes("invalid.email"), true);
});

Deno.test("client: skips null/undefined/empty query params but keeps 0", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new ConstantContactClient(ctx).request("/x", {
    query: { a: "kept", b: undefined, c: null, d: "", limit: 0 },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("a"), "kept");
  assertEquals(url.searchParams.has("b"), false);
  assertEquals(url.searchParams.has("c"), false);
  assertEquals(url.searchParams.has("d"), false);
  assertEquals(url.searchParams.get("limit"), "0");
});

Deno.test("client: passes an absolute URL through unchanged", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new ConstantContactClient(ctx).request("https://example.internal/foo?x=1");
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://example.internal");
  assertEquals(url.pathname, "/foo");
});

Deno.test("client: sends a JSON body with a content-type header", async () => {
  const { ctx, calls } = mockCtx([{ body: { list_id: "1" } }]);
  await new ConstantContactClient(ctx).request("/contact_lists", {
    method: "POST",
    body: { name: "x" },
  });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, JSON.stringify({ name: "x" }));
});

Deno.test("client: always asks for JSON and never sets a credential header", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new ConstantContactClient(ctx).request("/contacts");
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("nextCursor: pulls the opaque token out of a relative _links.next.href", () => {
  const href = "/v3/contacts?limit=50&cursor=bGltaXQ9NTAmbmV4dD0yY2Q4MDI3YQ%3D%3D";
  assertEquals(nextCursor({ next: { href } }), "bGltaXQ9NTAmbmV4dD0yY2Q4MDI3YQ==");
});

Deno.test("nextCursor: returns undefined on the last page", () => {
  assertEquals(nextCursor(undefined), undefined);
  assertEquals(nextCursor({}), undefined);
  assertEquals(nextCursor({ next: {} }), undefined);
});

Deno.test("nextCursor: returns undefined rather than guessing when the link has no cursor", () => {
  assertEquals(nextCursor({ next: { href: "/v3/contacts?limit=50" } }), undefined);
  assertEquals(nextCursor({ next: { href: "/v3/contacts" } }), undefined);
});
