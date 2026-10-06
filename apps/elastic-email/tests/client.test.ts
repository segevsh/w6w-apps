import { assertEquals, assertRejects } from "@std/assert";
import { compact, ElasticClient, formatElasticError, toList, truncate } from "../lib/client.ts";
import { errorBody, mockCtx, queryOf } from "./_helpers.ts";

Deno.test("client: errors surface the vendor's Error text", async () => {
  const { ctx } = mockCtx([{ status: 400, body: errorBody("Contact not found") }]);
  await assertRejects(
    () => new ElasticClient(ctx).json("/contacts/x"),
    Error,
    "Elastic Email 400 for GET /v4/contacts/x: Contact not found",
  );
});

Deno.test("client: a 200 carrying an Error envelope still throws; empty body is undefined", async () => {
  await assertRejects(
    () => new ElasticClient(mockCtx([{ body: errorBody("nope") }]).ctx).json("/x"),
    Error,
    "nope",
  );
  assertEquals(await new ElasticClient(mockCtx([{ body: "" }]).ctx).json("/x"), undefined);
});

Deno.test("client: array query params are repeated, unset ones dropped", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await new ElasticClient(ctx).json("/templates", {
    query: { scopeType: ["Personal", "Global"], limit: 0, offset: undefined, x: "" },
  });
  assertEquals(
    new URL(calls[0].url).searchParams.getAll("scopeType"),
    ["Personal", "Global"],
  );
  assertEquals(queryOf(calls[0].url).limit, "0");
  assertEquals(new URL(calls[0].url).searchParams.has("x"), false);
});

Deno.test("client: helpers", () => {
  assertEquals(toList("a@b.c, d@e.f\ng@h.i"), ["a@b.c", "d@e.f", "g@h.i"]);
  assertEquals(toList(""), undefined);
  assertEquals(compact({ a: 0, b: false, c: "", d: null }), { a: 0, b: false });
  assertEquals(truncate("x".repeat(700)).includes("truncated"), true);
  assertEquals(formatElasticError(500, "GET", "/p", "plain").includes("plain"), true);
});
