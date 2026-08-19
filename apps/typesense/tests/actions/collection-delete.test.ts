import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/collection-delete.ts";

const D = { display: { host: "https://search.internal:8108" } };
const noAliases = { status: 200, body: { aliases: [] } };
const dropped = { status: 200, body: { name: "products_v1", num_documents: 12000 } };

Deno.test("collection-delete: drops the collection after confirmation", async () => {
  const { ctx, calls } = mockCtx([noAliases, dropped], D);
  const result = await action.execute({ collection: "products_v1", confirm: true }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(calls[1].method, "DELETE");
  assertEquals(new URL(calls[1].url).pathname, "/collections/products_v1");
  assertEquals(result.numDocuments, 12000);
  assertEquals(result.deleted, true);
});

/** An alias outlives the collection and 404s on every search. */
Deno.test("collection-delete: names the aliases about to break, and warns", async () => {
  const { ctx, logs } = mockCtx([
    { status: 200, body: { aliases: [{ name: "products", collection_name: "products_v1" }] } },
    dropped,
  ], D);
  const result = await action.execute({ collection: "products_v1", confirm: true }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(result.brokenAliases, ["products"]);
  assert(
    logs.some((l) => l.level === "warn" && /will 404/.test(l.message)),
    JSON.stringify(logs),
  );
});

/** A search-only key cannot list aliases; that is not a reason to refuse. */
Deno.test("collection-delete: a key that cannot list aliases still deletes", async () => {
  const { ctx, calls } = mockCtx([{ status: 401, body: { message: "Forbidden" } }, dropped], D);
  const result = await action.execute({ collection: "products_v1", confirm: true }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(result.brokenAliases, []);
  assertEquals(calls.length, 2);
});

Deno.test("collection-delete: refuses without confirmation, before any request", async () => {
  const { ctx, calls } = mockCtx([], D);
  const err = await assertRejects(
    async () => await action.execute({ collection: "products_v1" }, ctx),
    Error,
  );
  assert(/no soft delete/.test(err.message), err.message);
  assertEquals(calls.length, 0);
});

Deno.test("collection-delete: is not idempotent", () => {
  assertEquals(action.idempotent, false);
});
