import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { compact, csv, idRef, PrintavoClient, toPage } from "../../lib/client.ts";

Deno.test("client: POSTs the document to the single endpoint without credentials", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { user: { id: "1" } } } }]);
  const out = await new PrintavoClient(ctx).query("{ user { id } }");
  assertEquals(out, { user: { id: "1" } });
  assertEquals(calls[0].url, "https://www.printavo.com/api/v2");
  assertEquals(calls[0].method, "POST");
  assertEquals("email" in calls[0].headers || "token" in calls[0].headers, false);
});

Deno.test("client: drops unset variables but keeps false and 0", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await new PrintavoClient(ctx).query("q", {
    a: "x",
    b: undefined,
    c: null,
    d: "",
    e: false,
    f: 0,
  });
  assertEquals(JSON.parse(calls[0].body!).variables, { a: "x", e: false, f: 0 });
});

Deno.test("client: treats GraphQL errors as failures even on HTTP 200", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { errors: [{ message: "Unauthorized" }], data: null },
  }]);
  await assertRejects(
    () => new PrintavoClient(ctx).query("q"),
    Error,
    "Printavo GraphQL error: Unauthorized",
  );
});

Deno.test("client: rejects non-JSON bodies, HTTP failures and empty data", async () => {
  await assertRejects(
    () => new PrintavoClient(mockCtx([{ status: 502, body: "<html>" }]).ctx).query("q"),
    Error,
    "Printavo 502",
  );
  await assertRejects(
    () => new PrintavoClient(mockCtx([{ status: 429, body: { data: { a: 1 } } }]).ctx).query("q"),
    Error,
    "Printavo 429",
  );
  await assertRejects(
    () => new PrintavoClient(mockCtx([{ body: {} }]).ctx).query("q"),
    Error,
    "Printavo returned no data",
  );
});

Deno.test("helpers: csv, idRef, compact and toPage", () => {
  assertEquals(csv(" a, b ,,c"), ["a", "b", "c"]);
  assertEquals(csv(""), undefined);
  assertEquals(csv(" , "), undefined);
  assertEquals(idRef("7"), { id: "7" });
  assertEquals(idRef(undefined), undefined);
  assertEquals(compact({ a: 1, b: undefined }), { a: 1 });
  assertEquals(toPage(undefined), { nodes: [], hasNextPage: false, endCursor: null });
  assertEquals(
    toPage({ nodes: [1], totalNodes: 5, pageInfo: { hasNextPage: true, endCursor: "z" } }),
    { nodes: [1], totalNodes: 5, hasNextPage: true, endCursor: "z" },
  );
});
