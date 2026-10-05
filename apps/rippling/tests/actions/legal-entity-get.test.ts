import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";
import legalEntityGet from "../../actions/legal-entity-get.ts";

Deno.test("legal-entity-get: GETs /legal-entities/<id>/ with the id URL-encoded and returns the record bare", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { id: "a b/1", created_at: "2025-01-01T00:00:00+00:00" },
  }]);
  const out = await legalEntityGet.execute({ id: "a b/1", expand: "parent" }, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/legal-entities/a%20b%2F1/");
  assertEquals(queryOf(calls[0].url), { expand: "parent" });
  assertEquals(out.id, "a b/1");
});

Deno.test("legal-entity-get: refuses an empty id before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve().then(() => legalEntityGet.execute({ id: "  " }, ctx)),
    Error,
    "id is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("legal-entity-get: a 404 surfaces Rippling's message and status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody("Not found.") }]);
  const err = await assertRejects(
    () => Promise.resolve().then(() => legalEntityGet.execute({ id: "x" }, ctx)),
    Error,
  );
  assertStringIncludes(err.message, "404");
  assertStringIncludes(err.message, "Not found.");
});

Deno.test("legal-entity-get: declares its scope and an id param, and sends no credential", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "x" } }]);
  await legalEntityGet.execute({ id: "x" }, ctx);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertStringIncludes(legalEntityGet.description ?? "", "legal-entities.read");
  assertEquals(legalEntityGet.params![0].key, "id");
  assertEquals(legalEntityGet.params![0].required, true);
});
