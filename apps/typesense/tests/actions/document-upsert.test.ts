import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/document-upsert.ts";

const D = { display: { host: "https://search.internal:8108" } };

Deno.test("document-upsert: posts one document and defaults to emplace", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "1", name: "a" } }], D);
  const result = await action.execute(
    { collection: "products", document: '{"id":"1","name":"a"}' },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(new URL(calls[0].url).pathname, "/collections/products/documents");
  assertEquals(new URL(calls[0].url).searchParams.get("action"), "emplace");
  assertEquals(result.id, "1");
  assertEquals(result.hadId, true);
  assertEquals(result.fields, ["id", "name"]);
});

/** Upsert replaces; the fields not carried are deleted. */
Deno.test("document-upsert: warns that an upsert removes absent fields", async () => {
  const { ctx, logs } = mockCtx([{ status: 200, body: { id: "1" } }], D);
  await action.execute(
    { collection: "products", document: '{"id":"1","name":"a"}', action: "upsert" },
    ctx,
  );
  assert(
    logs.some((l) => /any field not present here is removed/.test(l.message)),
    JSON.stringify(logs),
  );
});

Deno.test("document-upsert: notes a document with no id", async () => {
  const { ctx, logs } = mockCtx([{ status: 200, body: { id: "gen" } }], D);
  const result = await action.execute(
    { collection: "products", document: '{"name":"a"}' },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(result.hadId, false);
  assert(
    logs.some((l) => /rather than updating the first/.test(l.message)),
    JSON.stringify(logs),
  );
});

Deno.test("document-upsert: an array is refused and points at the bulk action", async () => {
  const { ctx, calls } = mockCtx([], D);
  const err = await assertRejects(
    async () => await action.execute({ collection: "products", document: "[{}]" }, ctx),
    Error,
  );
  assert(/use `document-import` for an array/.test(err.message), err.message);
  assertEquals(calls.length, 0);
});

/** This one reports failure as an HTTP error, unlike the bulk endpoint. */
Deno.test("document-upsert: says it is the safer of the two writes", () => {
  assert(/SAFER than `document-import`/.test(action.description!), action.description);
  assertEquals(action.idempotent, true);
});
