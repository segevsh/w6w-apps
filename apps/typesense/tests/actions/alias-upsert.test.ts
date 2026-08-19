import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/alias-upsert.ts";

const D = { display: { host: "https://search.internal:8108" } };
const populated = { status: 200, body: { name: "products_v4", num_documents: 12000 } };
const collections = { status: 200, body: [{ name: "products_v3" }, { name: "products_v4" }] };
const existing = { status: 200, body: { name: "products", collection_name: "products_v3" } };
const updated = { status: 200, body: { name: "products", collection_name: "products_v4" } };

/** The swap in a zero-downtime reindex. */
Deno.test("alias-upsert: points the alias at the new collection", async () => {
  const { ctx, calls } = mockCtx([populated, collections, existing, updated], D);
  const result = await action.execute(
    { alias: "products", collection: "products_v4" },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls[3].method, "PUT");
  assertEquals(new URL(calls[3].url).pathname, "/aliases/products");
  assertEquals(JSON.parse(calls[3].body!), { collection_name: "products_v4" });
  assertEquals(result.previousCollection, "products_v3");
  assertEquals(result.changed, true);
  assertEquals(result.targetDocuments, 12000);
});

/** Searches keep working, return nothing, and look like a search problem. */
Deno.test("alias-upsert: refuses to point at an empty collection", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { num_documents: 0 } }], D);
  const err = await assertRejects(
    async () => await action.execute({ alias: "products", collection: "products_v4" }, ctx),
    Error,
  );
  assert(/reads as a search problem/.test(err.message), err.message);
  assertEquals(calls.length, 1, "it must not swap");
});

Deno.test("alias-upsert: allowEmpty lets a deliberately empty target through", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { num_documents: 0 } },
    collections,
    existing,
    updated,
  ], D);
  const result = await action.execute(
    { alias: "products", collection: "products_v4", allowEmpty: true },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(result.targetDocuments, 0);
  assertEquals(calls.length, 4);
});

/** Typesense resolves the collection first, so the alias does nothing. */
Deno.test("alias-upsert: warns when a collection shares the alias's name", async () => {
  const { ctx, logs } = mockCtx([
    populated,
    { status: 200, body: [{ name: "products" }, { name: "products_v4" }] },
    existing,
    updated,
  ], D);
  const result = await action.execute(
    { alias: "products", collection: "products_v4" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(result.shadowedByCollection, true);
  assert(
    logs.some((l) => l.level === "warn" && /appear to do nothing/.test(l.message)),
    JSON.stringify(logs),
  );
});

/** A new alias has no previous target, and the 404 is the normal case. */
Deno.test("alias-upsert: a brand new alias is created without a previous collection", async () => {
  const { ctx } = mockCtx([
    populated,
    collections,
    { status: 404, body: { message: "Not found." } },
    updated,
  ], D);
  const result = await action.execute(
    { alias: "products", collection: "products_v4" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(result.previousCollection, undefined);
  assertEquals(result.changed, true);
});

Deno.test("alias-upsert: requires both names", async () => {
  const { ctx, calls } = mockCtx([], D);
  await assertRejects(
    async () => await action.execute({ collection: "products_v4" }, ctx),
    Error,
    "`alias` is required",
  );
  await assertRejects(
    async () => await action.execute({ alias: "products" }, ctx),
    Error,
    "`collection` is required",
  );
  assertEquals(calls.length, 0);
});
