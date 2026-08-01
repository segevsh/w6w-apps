import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  API_VERSION,
  encodeUrn,
  LinkedInClient,
  organizationUrn,
  personUrn,
} from "../../lib/client.ts";

Deno.test("client: sends the two headers every /rest/ call requires", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const client = new LinkedInClient(ctx);
  await client.request("/rest/posts/x");
  assertEquals(calls[0].headers["x-restli-protocol-version"], "2.0.0");
  assertEquals(calls[0].headers["linkedin-version"], API_VERSION);
});

Deno.test("client: 201 with x-restli-id header and no body returns { id }", async () => {
  const { ctx } = mockCtx([
    { status: 201, headers: { "x-restli-id": "urn:li:share:123" } },
  ]);
  const client = new LinkedInClient(ctx);
  const result = await client.request<{ id: string }>("/rest/posts", {
    method: "POST",
    body: { commentary: "hi" },
  });
  assertEquals(result.id, "urn:li:share:123");
});

Deno.test("client: 204 returns undefined without parsing a body", async () => {
  const { ctx } = mockCtx([{ status: 204, headers: {} }]);
  const client = new LinkedInClient(ctx);
  const result = await client.request("/rest/posts/x", { method: "DELETE" });
  assertEquals(result, undefined);
});

Deno.test("client: parses a JSON body when present", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { id: "urn:li:share:1", commentary: "hi" } }]);
  const client = new LinkedInClient(ctx);
  const result = await client.request<{ id: string }>("/rest/posts/x");
  assertEquals(result.id, "urn:li:share:1");
});

Deno.test("client: throws a descriptive Error on non-2xx, using the vendor message", async () => {
  const { ctx } = mockCtx([
    { status: 400, statusText: "Bad Request", body: { message: "MISSING_FIELD" } },
  ]);
  const client = new LinkedInClient(ctx);
  const err = await assertRejects(
    () => client.request("/rest/posts", { method: "POST", body: {} }),
    Error,
    "LinkedIn 400",
  );
  assertEquals(err.message.includes("MISSING_FIELD"), true);
});

Deno.test("client: skips null/undefined/empty query params", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const client = new LinkedInClient(ctx);
  await client.request("/rest/posts", {
    query: { a: "kept", b: undefined, c: null, d: "" },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("a"), "kept");
  assertEquals(url.searchParams.has("b"), false);
  assertEquals(url.searchParams.has("c"), false);
  assertEquals(url.searchParams.has("d"), false);
});

Deno.test("client: sets X-RestLi-Method when restliMethod is given", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { elements: [] } }]);
  const client = new LinkedInClient(ctx);
  await client.request("/rest/posts", { restliMethod: "FINDER", query: { q: "author" } });
  assertEquals(calls[0].headers["x-restli-method"], "FINDER");
});

Deno.test("client: passes an absolute URL through unchanged", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  const client = new LinkedInClient(ctx);
  await client.request("https://api.linkedin.com/v2/userinfo");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/userinfo");
});

Deno.test("personUrn / organizationUrn: builds a URN from a raw id, passes an existing URN through", () => {
  assertEquals(personUrn("abc123"), "urn:li:person:abc123");
  assertEquals(personUrn("urn:li:person:abc123"), "urn:li:person:abc123");
  assertEquals(organizationUrn("5515715"), "urn:li:organization:5515715");
  assertEquals(organizationUrn("urn:li:organization:5515715"), "urn:li:organization:5515715");
});

Deno.test("encodeUrn: URL-encodes a URN for use as a path segment", () => {
  assertEquals(encodeUrn("urn:li:share:123"), "urn%3Ali%3Ashare%3A123");
});
