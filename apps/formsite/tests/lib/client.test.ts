import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { baseUrl, FormsiteClient, targetFromConnection, unset } from "../../lib/client.ts";
import { mockCtx, mockFormsiteCtx } from "../_helpers.ts";

Deno.test("client: baseUrl builds the server host", () => {
  assertEquals(baseUrl("fs12"), "https://fs12.formsite.com/api/v2");
});

Deno.test("client: unset blanks become undefined", () => {
  assertEquals(unset(""), undefined);
  assertEquals(unset("x"), "x");
});

Deno.test("client: a connection without server/userDir throws", () => {
  assertThrows(() => targetFromConnection(undefined), Error, "reconnect");
  assertThrows(() => new FormsiteClient(mockCtx().ctx), Error, "no server");
});

Deno.test("client: encodes the user directory and skips blank query values", async () => {
  const { ctx, calls } = mockFormsiteCtx([{ body: {} }], { server: "fs1", userDir: "a b" });
  await new FormsiteClient(ctx).request("/forms", { query: { x: "", y: undefined, z: 1 } });
  assertEquals(calls[0].url, "https://fs1.formsite.com/api/v2/a%20b/forms?z=1");
});

Deno.test("client: surfaces the vendor error message", async () => {
  const { ctx } = mockFormsiteCtx([
    { status: 401, body: { error: { message: "Invalid access token.", status: 401 } } },
  ]);
  await assertRejects(
    () => new FormsiteClient(ctx).request("/forms"),
    Error,
    "Invalid access token.",
  );
});

Deno.test("client: falls back to the raw body on a non-JSON error", async () => {
  const { ctx } = mockFormsiteCtx([{ status: 502, body: "bad gateway" }]);
  await assertRejects(() => new FormsiteClient(ctx).request("/forms"), Error, "bad gateway");
});

Deno.test("client: reads Pagination-* headers", async () => {
  const { ctx } = mockFormsiteCtx([{
    body: { results: [] },
    headers: {
      "content-type": "application/json",
      "pagination-limit": "100",
      "pagination-page-current": "2",
      "pagination-page-last": "5",
    },
  }]);
  const res = await new FormsiteClient(ctx).requestPage("/forms/f/results");
  assertEquals(res.pagination, { limit: 100, page: 2, lastPage: 5 });
});
