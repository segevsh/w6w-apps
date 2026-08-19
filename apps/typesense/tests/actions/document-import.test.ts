import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/document-import.ts";

const D = { display: { host: "https://search.internal:8108" } };
const documents = JSON.stringify([{ id: "1", name: "a" }, { id: "2", name: "b" }]);

/** JSONL out, one line per document, in order. */
Deno.test("document-import: sends JSONL and the chosen action", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: '{"success":true}\n{"success":true}',
  }], D);
  const result = await action.execute({ collection: "products", documents }, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(new URL(calls[0].url).pathname, "/collections/products/documents/import");
  assertEquals(new URL(calls[0].url).searchParams.get("action"), "upsert");
  assertEquals(calls[0].body, '{"id":"1","name":"a"}\n{"id":"2","name":"b"}');
  assertEquals(result.succeeded, 2);
  assertEquals(result.allSucceeded, true);
});

/**
 * The trap: Typesense answers 200 while rejecting every document, so a step
 * that checks the status reports a successful import of nothing.
 */
Deno.test("document-import: fails the step when a 200 hides a rejection", async () => {
  const { ctx, logs } = mockCtx([{
    status: 200,
    body: '{"success":true}\n{"success":false,"error":"Bad JSON."}',
  }], D);
  const err = await assertRejects(
    async () => await action.execute({ collection: "products", documents }, ctx),
    Error,
  );
  assert(/1 of 2 documents were rejected/.test(err.message), err.message);
  assert(/returned 200 regardless/.test(err.message), err.message);
  assert(
    logs.some((l) => l.level === "warn" && /per-document/.test(l.message)),
    JSON.stringify(logs),
  );
});

Deno.test("document-import: allowPartial accepts the incomplete write and reports it", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: '{"success":true}\n{"success":false,"error":"Bad JSON."}',
  }], D);
  const result = await action.execute(
    { collection: "products", documents, allowPartial: true },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(result.succeeded, 1);
  assertEquals(result.failedCount, 1);
  assertEquals(result.allSucceeded, false);
  assertEquals((result.failures as Array<{ error: string }>)[0].error, "Bad JSON.");
});

/** An upsert cannot match a generated id, so a re-run duplicates. */
Deno.test("document-import: notes documents with no id", async () => {
  const { ctx, logs } = mockCtx([{ status: 200, body: '{"success":true}' }], D);
  const result = await action.execute(
    { collection: "products", documents: '[{"name":"a"}]' },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(result.withoutId, 1);
  assert(
    logs.some((l) => /creates duplicates rather than updating/.test(l.message)),
    JSON.stringify(logs),
  );
});

Deno.test("document-import: the write mode and dirty_values reach the query", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: '{"success":true}\n{"success":true}' }], D);
  await action.execute(
    { collection: "products", documents, action: "emplace", dirtyValues: "coerce_or_drop" },
    ctx,
  );
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("action"), "emplace");
  assertEquals(q.get("dirty_values"), "coerce_or_drop");
});

Deno.test("document-import: requires a collection and a non-empty array", async () => {
  const { ctx, calls } = mockCtx([], D);
  await assertRejects(
    async () => await action.execute({ documents }, ctx),
    Error,
    "`collection` is required",
  );
  await assertRejects(
    async () => await action.execute({ collection: "products", documents: "[]" }, ctx),
    Error,
    "non-empty array",
  );
  assertEquals(calls.length, 0);
});
