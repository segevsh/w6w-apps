import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { FacebookClient } from "../../lib/client.ts";

Deno.test("client: throws a descriptive Error carrying the vendor's error.message on non-2xx", async () => {
  const { ctx } = mockCtx([
    { status: 400, statusText: "Bad Request", body: { error: { message: "boom", code: 100 } } },
  ]);
  const client = new FacebookClient(ctx);
  const err = await assertRejects(
    () => client.request("/12345/feed"),
    Error,
    "Facebook 400",
  );
  assertEquals(err.message.includes("boom"), true);
  assertEquals(err.message.includes("/v23.0/12345/feed"), true);
});

Deno.test("client: falls back to raw text when the error body isn't Facebook's JSON envelope", async () => {
  const { ctx } = mockCtx([{ status: 500, statusText: "Internal Error", body: "oops" }]);
  const client = new FacebookClient(ctx);
  const err = await assertRejects(() => client.request("/x"), Error);
  assertEquals(err.message.includes("oops"), true);
});

Deno.test("client: skips null/undefined/empty params", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const client = new FacebookClient(ctx);
  await client.request("/x", { params: { a: "kept", b: undefined, c: null, d: "" } });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("a"), "kept");
  assertEquals(url.searchParams.has("b"), false);
  assertEquals(url.searchParams.has("c"), false);
  assertEquals(url.searchParams.has("d"), false);
});

Deno.test("client: sends POST params in the query string, not a JSON body", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "1" } }]);
  const client = new FacebookClient(ctx);
  await client.request("/x/feed", { method: "POST", params: { message: "hi" } });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].body, null);
  assertEquals(new URL(calls[0].url).searchParams.get("message"), "hi");
});

Deno.test("client: never sets an Authorization header (credentials belong to `sign`)", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const client = new FacebookClient(ctx);
  await client.request("/x");
  assertEquals("authorization" in calls[0].headers, false);
});
