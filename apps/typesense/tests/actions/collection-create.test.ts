import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/collection-create.ts";

const D = { display: { host: "https://search.internal:8108" } };
const fields = JSON.stringify([
  { name: "title", type: "string" },
  { name: "price", type: "float" },
]);
const created = { status: 200, body: { name: "products_v2", created_at: 1_760_000_000 } };

Deno.test("collection-create: posts the schema and reports the searchable fields", async () => {
  const { ctx, calls } = mockCtx([created], D);
  const result = await action.execute(
    { name: "products_v2", fields, defaultSortingField: "price" },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(new URL(calls[0].url).pathname, "/collections");
  const body = JSON.parse(calls[0].body!) as Record<string, unknown>;
  assertEquals(body.name, "products_v2");
  assertEquals(body.default_sorting_field, "price");
  assertEquals(result.searchableFields, ["title"]);
  assertEquals(result.fieldCount, 2);
});

Deno.test("collection-create: an omitted sorting field is not sent as empty", async () => {
  const { ctx, calls } = mockCtx([created], D);
  await action.execute({ name: "products_v2", fields }, ctx);
  assertEquals("default_sorting_field" in JSON.parse(calls[0].body!), false);
});

/** Auto types are decided by whichever record arrives first. */
Deno.test("collection-create: notes an auto-typed schema", async () => {
  const { ctx, logs } = mockCtx([created], D);
  const result = await action.execute(
    { name: "x", fields: '[{"name":".*","type":"auto"}]' },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(result.usesAutoTypes, true);
  assertEquals(result.acceptsUnknownFields, true);
  assert(
    logs.some((l) => /whichever record arrives first/.test(l.message)),
    JSON.stringify(logs),
  );
});

Deno.test("collection-create: every field needs a name and a type", async () => {
  const { ctx, calls } = mockCtx([], D);
  const err = await assertRejects(
    async () =>
      await action.execute({ name: "x", fields: '[{"name":"a"},{"type":"string"}]' }, ctx),
    Error,
  );
  assert(/these do not: 0, 1/.test(err.message), err.message);
  assertEquals(calls.length, 0);
});

Deno.test("collection-create: requires a name and a non-empty field list", async () => {
  const { ctx } = mockCtx([], D);
  await assertRejects(async () => await action.execute({ fields }, ctx), Error, "`name`");
  await assertRejects(
    async () => await action.execute({ name: "x", fields: "[]" }, ctx),
    Error,
    "non-empty",
  );
});

/** There is no create-or-update on a collection. */
Deno.test("collection-create: is not idempotent, and says why", () => {
  assertEquals(action.idempotent, false);
  assert(/NO create-or-update/.test(action.description!), action.description);
  assert(/swapping an ALIAS/.test(action.description!), action.description);
});
