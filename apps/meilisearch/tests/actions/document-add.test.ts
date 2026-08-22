import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/document-add.ts";

const conn = { display: { baseUrl: "https://search.example.com", indexUid: "movies" } };
const DOCS = '[{"id":1,"title":"Dune"}]';

/** PUT merges, POST replaces — and the wrong one silently drops fields. */
Deno.test("document-add: merge is a PUT and replace is a POST", async () => {
  const merge = mockCtx([{ status: 200, body: { taskUid: 1, status: "enqueued" } }], conn);
  await action.execute!({ documents: DOCS, mode: "merge" }, merge.ctx);
  assertEquals(merge.calls[0].method, "PUT");
  assertEquals(merge.calls[0].url, "https://search.example.com/indexes/movies/documents");

  const replace = mockCtx([{ status: 200, body: {} }], conn);
  await action.execute!({ documents: DOCS, mode: "replace" }, replace.ctx);
  assertEquals(replace.calls[0].method, "POST");
});

/** The safer verb is the default: merge keeps what you did not send. */
Deno.test("document-add: defaults to merge", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], conn);
  await action.execute!({ documents: DOCS }, ctx);
  assertEquals(calls[0].method, "PUT");
});

Deno.test("document-add: the documents are the body, verbatim", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], conn);
  await action.execute!({ documents: DOCS }, ctx);
  assertEquals(JSON.parse(calls[0].body!), [{ id: 1, title: "Dune" }]);
});

Deno.test("document-add: a primary key is only sent when given", async () => {
  const without = mockCtx([{ status: 200, body: {} }], conn);
  await action.execute!({ documents: DOCS }, without.ctx);
  assertEquals(new URL(without.calls[0].url).searchParams.get("primaryKey"), null);

  const with_ = mockCtx([{ status: 200, body: {} }], conn);
  await action.execute!({ documents: DOCS, primaryKey: "id" }, with_.ctx);
  assertEquals(new URL(with_.calls[0].url).searchParams.get("primaryKey"), "id");
});

/** The response is a receipt; the work has not happened. */
Deno.test("document-add: the output says the task is only enqueued", () => {
  const outputs = action.output as Array<{ key: string; label: string }>;
  assert(outputs.find((o) => o.key === "status")!.label.includes("Always `enqueued`"));
  assert(outputs.find((o) => o.key === "taskUid")!.label.includes("Get Task"));
});

Deno.test("document-add: an empty or non-array documents value is refused", async () => {
  for (const documents of ["[]", '{"id":1}']) {
    const { ctx, calls } = mockCtx([], conn);
    await assertRejects(
      async () => await action.execute!({ documents }, ctx),
      Error,
      "`documents` is required",
    );
    assertEquals(calls.length, 0);
  }
});

Deno.test("document-add: an unknown mode is refused before any request", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ documents: DOCS, mode: "upsert" }, ctx),
    Error,
    "`mode` must be",
  );
  assertEquals(calls.length, 0);
});
