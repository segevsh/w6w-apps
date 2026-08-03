import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  API_URL,
  compact,
  GraphClient,
  itemBody,
  odataList,
  seg,
  teamsError,
} from "../../lib/client.ts";

Deno.test("client: targets the v1.0 endpoint, never beta", () => {
  assertEquals(API_URL, "https://graph.microsoft.com/v1.0");
});

Deno.test("client: builds an absolute URL and drops empty query values", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await new GraphClient(ctx).request("/teams/t1/channels", {
    query: { $filter: "a eq 1", $select: undefined, $top: 0, $expand: "" },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://graph.microsoft.com/v1.0/teams/t1/channels");
  assertEquals(url.searchParams.get("$filter"), "a eq 1");
  assertEquals(url.searchParams.has("$select"), false);
  assertEquals(url.searchParams.has("$expand"), false);
  // 0 is a legitimate value, not an absence.
  assertEquals(url.searchParams.get("$top"), "0");
});

Deno.test("client: sends no Authorization header — the sign hook owns the credential", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new GraphClient(ctx).request("/me/joinedTeams");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("client: JSON-encodes a body and sets content-type", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "1" } }]);
  await new GraphClient(ctx).request("/chats/c1/messages", {
    method: "POST",
    body: { body: { contentType: "html", content: "hi" } },
  });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!).body.content, "hi");
});

Deno.test("client: returns undefined for the bodiless 202/204 responses", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  assertEquals(await new GraphClient(ctx).request("/x", { method: "DELETE" }), undefined);
});

Deno.test("client: surfaces Graph's error code and message", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    statusText: "Forbidden",
    body: { error: { code: "Forbidden", message: "Missing scope ChannelMessage.Read.All" } },
  }]);
  const err = await assertRejects(
    () => new GraphClient(ctx).request("/teams/t/channels/c/messages"),
  );
  assert(err instanceof Error);
  assert(err.message.includes("403"));
  assert(err.message.includes("Forbidden: Missing scope ChannelMessage.Read.All"));
});

Deno.test("client: falls back to the raw body when the error is not Graph's envelope", async () => {
  const { ctx } = mockCtx([{ status: 502, body: "<html>gateway</html>" }]);
  const err = await assertRejects(() => new GraphClient(ctx).request("/me/chats"));
  assert((err as Error).message.includes("gateway"));
});

Deno.test("client: page() unwraps `value` and hands back the nextLink", async () => {
  const next = "https://graph.microsoft.com/v1.0/me/chats?$skiptoken=abc";
  const { ctx } = mockCtx([{ body: { value: [{ id: "a" }], "@odata.nextLink": next } }]);
  const out = await new GraphClient(ctx).page("/me/chats");
  assertEquals(out.value.length, 1);
  assertEquals(out.nextLink, next);
  assertEquals(out.pages, 1);
});

Deno.test("client: page() tolerates a response with no `value` array", async () => {
  const { ctx } = mockCtx([{ body: {} }]);
  const out = await new GraphClient(ctx).page("/me/chats");
  assertEquals(out.value, []);
});

Deno.test("client: collect() walks nextLink and stops at the cap, returning the cursor", async () => {
  const n1 = "https://graph.microsoft.com/v1.0/me/chats?p=1";
  const n2 = "https://graph.microsoft.com/v1.0/me/chats?p=2";
  const { ctx, calls } = mockCtx([
    { body: { value: [{ id: "a" }], "@odata.nextLink": n1 } },
    { body: { value: [{ id: "b" }], "@odata.nextLink": n2 } },
  ]);
  const out = await new GraphClient(ctx).collect("/me/chats", {}, 2);
  assertEquals(calls.length, 2);
  assertEquals(calls[1].url, n1);
  assertEquals(out.value.length, 2);
  assertEquals(out.pages, 2);
  assertEquals(out.nextLink, n2);
});

Deno.test("client: collect() replays the nextLink without re-decorating the query", async () => {
  const n1 = "https://graph.microsoft.com/v1.0/me/chats?$top=5&$skiptoken=x";
  const { ctx, calls } = mockCtx([
    { body: { value: [], "@odata.nextLink": n1 } },
    { body: { value: [] } },
  ]);
  await new GraphClient(ctx).collect("/me/chats", { query: { $top: 5 } }, 10);
  assertEquals(calls[1].url, n1);
});

Deno.test("seg: percent-encodes the `:` and `@` in a channel or chat id", () => {
  assertEquals(
    seg("19:4a95f7d8db4c4e7fae857bcebe0623e6@thread.tacv2"),
    "19%3A4a95f7d8db4c4e7fae857bcebe0623e6%40thread.tacv2",
  );
  assertEquals(seg("  fbe2bf47-16c8  "), "fbe2bf47-16c8");
});

Deno.test("seg: survives round-tripping through URL without being decoded", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const channel = "19:4a95f7d8db4c4e7fae857bcebe0623e6@thread.tacv2";
  await new GraphClient(ctx).request(`/teams/t1/channels/${seg(channel)}`);
  assert(new URL(calls[0].url).pathname.includes("19%3A4a95"));
});

Deno.test("itemBody: defaults to html and accepts text case-insensitively", () => {
  assertEquals(itemBody("hi"), { contentType: "html", content: "hi" });
  assertEquals(itemBody("hi", "TEXT"), { contentType: "text", content: "hi" });
  assertEquals(itemBody("hi", "html"), { contentType: "html", content: "hi" });
  // Anything unrecognised falls back to html rather than being passed through.
  assertEquals(itemBody("hi", "markdown").contentType, "html");
});

Deno.test("odataList: joins with commas and drops blanks", () => {
  assertEquals(odataList(["id", " displayName ", ""]), "id,displayName");
  assertEquals(odataList([]), undefined);
  assertEquals(odataList(undefined), undefined);
});

Deno.test("compact: drops undefined but keeps null, false and empty string", () => {
  assertEquals(
    compact({ a: 1, b: undefined, c: null, d: false, e: "" }),
    { a: 1, c: null, d: false, e: "" },
  );
});

Deno.test("teamsError: marks a local failure as ours, not Graph's", () => {
  assert(teamsError("User is required").startsWith("Microsoft Teams:"));
});
