import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { API_URL, encodeId, GoogleTasksClient } from "../../lib/client.ts";

Deno.test("API_URL includes the /tasks/v1 path prefix, not just the host", () => {
  assertEquals(API_URL, "https://tasks.googleapis.com/tasks/v1");
});

Deno.test("client: resolves a relative path against the versioned base", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  await new GoogleTasksClient(ctx).request("/users/@me/lists");
  assertEquals(calls[0].url, "https://tasks.googleapis.com/tasks/v1/users/@me/lists");
});

Deno.test("client: drops undefined, null and empty-string query values but keeps false and 0", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new GoogleTasksClient(ctx).request("/x", {
    query: { a: undefined, b: null, c: "", d: false, e: 0, f: "v" },
  });
  const p = new URL(calls[0].url).searchParams;
  assertEquals(p.has("a"), false);
  assertEquals(p.has("b"), false);
  assertEquals(p.has("c"), false);
  assertEquals(p.get("d"), "false");
  assertEquals(p.get("e"), "0");
  assertEquals(p.get("f"), "v");
});

Deno.test("client: JSON-encodes an object body and sets content-type", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new GoogleTasksClient(ctx).request("/x", { method: "POST", body: { title: "t" } });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, '{"title":"t"}');
});

Deno.test("client: sends no body and no content-type when body is omitted", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new GoogleTasksClient(ctx).request("/x", { method: "POST" });
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers["content-type"], undefined);
});

Deno.test("client: never sets an Authorization header — that is the sign hook's job", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new GoogleTasksClient(ctx).request("/x");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("client: normalises 204 and empty 200 bodies to undefined", async () => {
  const { ctx } = mockCtx([{ status: 204 }, { status: 200 }]);
  const client = new GoogleTasksClient(ctx);
  assertEquals(await client.request("/x"), undefined);
  assertEquals(await client.request("/y"), undefined);
});

Deno.test("client: throws with status and upstream detail on a non-2xx", async () => {
  const { ctx } = mockCtx([{ status: 403, statusText: "Forbidden", body: "insufficient scope" }]);
  const err = await assertRejects(() => new GoogleTasksClient(ctx).request("/x"), Error);
  assert(err.message.includes("403"));
  assert(err.message.includes("insufficient scope"));
  assert(err.message.includes("Google Tasks"));
});

Deno.test("encodeId: keeps an id inside one path segment", () => {
  assertEquals(encodeId("MTIzNDU2"), "MTIzNDU2");
  assertEquals(encodeId("a/b"), "a%2Fb");
  assertEquals(encodeId("a b"), "a%20b");
  assertEquals(encodeId("a?b#c"), "a%3Fb%23c");
});
