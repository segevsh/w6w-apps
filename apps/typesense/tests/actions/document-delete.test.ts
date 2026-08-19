import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/document-delete.ts";

const D = { display: { host: "https://search.internal:8108" } };

Deno.test("document-delete: deleting by id hits the document endpoint", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "1" } }], D);
  const result = await action.execute({ collection: "products", id: "1" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/collections/products/documents/1");
  assertEquals(result.mode, "id");
  assertEquals(result.deleted, 1);
});

/** The dry run the API does not offer. */
Deno.test("document-delete: counts a filter's matches before deleting", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { found: 12 } },
    { status: 200, body: { num_deleted: 12 } },
  ], D);
  const result = await action.execute(
    { collection: "products", filterBy: "in_stock:false" },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls[0].method, "GET", "the count comes first");
  assertEquals(new URL(calls[0].url).searchParams.get("filter_by"), "in_stock:false");
  assertEquals(calls[1].method, "DELETE");
  assertEquals(result.matched, 12);
  assertEquals(result.deleted, 12);
});

/** A filter matching everything empties the collection and reports success. */
Deno.test("document-delete: refuses past the limit, before deleting anything", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { found: 40000 } }], D);
  const err = await assertRejects(
    async () => await action.execute({ collection: "products", filterBy: "id:!=nothing" }, ctx),
    Error,
  );
  assert(/matches 40000 documents/.test(err.message), err.message);
  assert(/report it as a success/.test(err.message), err.message);
  assertEquals(calls.length, 1, "it must not delete");
});

Deno.test("document-delete: a raised limit lets it through", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { found: 40000 } },
    { status: 200, body: { num_deleted: 40000 } },
  ], D);
  const result = await action.execute(
    { collection: "products", filterBy: "in_stock:false", maxDocuments: 50000 },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls.length, 2);
  assertEquals(result.deleted, 40000);
});

Deno.test("document-delete: a filter matching nothing deletes nothing", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { found: 0 } }], D);
  const result = await action.execute(
    { collection: "products", filterBy: "in_stock:false" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(result.deleted, 0);
  assertEquals(calls.length, 1, "there is nothing to delete");
});

Deno.test("document-delete: an id and a filter together are refused", async () => {
  const { ctx, calls } = mockCtx([], D);
  await assertRejects(
    async () => await action.execute({ collection: "products" }, ctx),
    Error,
    "either an `id` or a `filterBy`",
  );
  const err = await assertRejects(
    async () => await action.execute({ collection: "products", id: "1", filterBy: "x:1" }, ctx),
    Error,
  );
  assert(/different endpoints/.test(err.message), err.message);
  assertEquals(calls.length, 0);
});

/** A search index reflects a source somewhere else. */
Deno.test("document-delete: warns that a re-index brings them back", async () => {
  const { ctx, logs } = mockCtx([
    { status: 200, body: { found: 5 } },
    { status: 200, body: { num_deleted: 5 } },
  ], D);
  await action.execute({ collection: "products", filterBy: "in_stock:false" }, ctx);
  assert(
    logs.some((l) => l.level === "warn" && /full re-index will bring them back/.test(l.message)),
    JSON.stringify(logs),
  );
});
