import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { compact, csv, HelpScoutClient, unset } from "../../lib/client.ts";

Deno.test("client: builds the URL against the fixed api.helpscout.net host", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  await new HelpScoutClient(ctx).request("/conversations/1");
  assertEquals(calls[0].url, "https://api.helpscout.net/v2/conversations/1");
  assertEquals("authorization" in calls[0].headers, false);
});

Deno.test("client: applies query params, skipping unset ones", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new HelpScoutClient(ctx).request("/conversations", {
    query: { status: "active", tag: undefined, page: 2 },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("status"), "active");
  assertEquals(url.searchParams.has("tag"), false);
  assertEquals(url.searchParams.get("page"), "2");
});

Deno.test("client: surfaces Help Scout's error body", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    statusText: "Bad Request",
    body:
      '{"message":"Validation error","_embedded":{"errors":[{"path":"subject","message":"Empty value"}]}}',
  }]);
  await assertRejects(
    () => new HelpScoutClient(ctx).request("/conversations", { method: "POST", body: {} }),
    Error,
    "Empty value",
  );
});

Deno.test("client: request returns undefined for a 204", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  assertEquals(
    await new HelpScoutClient(ctx).request("/conversations/1", { method: "DELETE" }),
    undefined,
  );
});

Deno.test("client: create() reads the id off Resource-ID/Location instead of the body", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    headers: {
      "resource-id": "123",
      "location": "https://api.helpscout.net/v2/conversations/123",
    },
  }]);
  const result = await new HelpScoutClient(ctx).create("/conversations", { subject: "Help" });
  assertEquals(result, {
    resourceId: 123,
    location: "https://api.helpscout.net/v2/conversations/123",
  });
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { subject: "Help" });
});

Deno.test("create() tolerates a response with no Resource-ID header", async () => {
  const { ctx } = mockCtx([{ status: 201, headers: {} }]);
  const result = await new HelpScoutClient(ctx).create("/conversations/1/notes", { text: "hi" });
  assertEquals(result, { resourceId: undefined, location: undefined });
});

Deno.test("compact/csv/unset behave as the other apps' helpers do", () => {
  assertEquals(compact({ a: 0, b: undefined, c: null, d: "" }), { a: 0 });
  assertEquals(csv("a, b"), ["a", "b"]);
  assertEquals(csv(""), undefined);
  assertEquals(unset(""), undefined);
  assertEquals(unset("x"), "x");
});
