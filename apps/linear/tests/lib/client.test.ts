import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { compact, csv, LinearClient } from "../../lib/client.ts";

Deno.test("client: POSTs the GraphQL document to the single endpoint", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { viewer: { id: "u1" } } } }]);
  const out = await new LinearClient(ctx).query("{ viewer { id } }");
  assertEquals(out, { viewer: { id: "u1" } });
  assertEquals(calls[0].url, "https://api.linear.app/graphql");
  assertEquals(calls[0].method, "POST");
  assertEquals("authorization" in calls[0].headers, false);
});

Deno.test("client: drops unset variables so they don't reach Linear as nulls", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await new LinearClient(ctx).query("query", { a: "kept", b: undefined, c: null, d: "" });
  assertEquals(JSON.parse(calls[0].body!).variables, { a: "kept" });
});

Deno.test("client: treats GraphQL errors as failures even on a 200", async () => {
  // This is the trap GraphQL sets: without this check a failed mutation looks
  // like a success whose result is undefined.
  const { ctx } = mockCtx([{ status: 200, body: { errors: [{ message: "Entity not found" }] } }]);
  await assertRejects(
    () => new LinearClient(ctx).query("query"),
    Error,
    "Linear GraphQL error: Entity not found",
  );
});

Deno.test("client: joins multiple GraphQL errors", async () => {
  const { ctx } = mockCtx([{ body: { errors: [{ message: "a" }, { message: "b" }] } }]);
  await assertRejects(() => new LinearClient(ctx).query("q"), Error, "a; b");
});

Deno.test("client: surfaces a non-JSON response", async () => {
  const { ctx } = mockCtx([{ status: 502, statusText: "Bad Gateway", body: "<html>" }]);
  await assertRejects(() => new LinearClient(ctx).query("q"), Error, "non-JSON response");
});

Deno.test("client: rejects a 200 with neither data nor errors", async () => {
  const { ctx } = mockCtx([{ body: {} }]);
  await assertRejects(() => new LinearClient(ctx).query("q"), Error, "returned no data");
});

Deno.test("compact: drops undefined, null and blank values", () => {
  assertEquals(compact({ a: 1, b: undefined, c: null, d: "", e: false }), { a: 1, e: false });
});

Deno.test("csv: splits, trims and drops blanks", () => {
  assertEquals(csv("a, b ,,c"), ["a", "b", "c"]);
  assertEquals(csv(""), undefined);
});
