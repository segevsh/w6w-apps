import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/document-delete.ts";

const conn = { display: { baseUrl: "https://search.example.com", indexUid: "movies" } };
const base = "https://search.example.com/indexes/movies/documents";

Deno.test("document-delete: by id is a DELETE on the document path", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { taskUid: 1 } }], conn);
  await action.execute!({ by: "id", documentId: "42" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, `${base}/42`);
});

Deno.test("document-delete: by ids POSTs the array to delete-batch", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], conn);
  await action.execute!({ by: "ids", documentIds: "1, 2, 3" }, ctx);
  assertEquals(calls[0].url, `${base}/delete-batch`);
  assertEquals(JSON.parse(calls[0].body!), ["1", "2", "3"]);
});

/** Nothing reports how many documents a filter matches before it runs. */
Deno.test("document-delete: by filter POSTs the filter and logs at warn", async () => {
  const { ctx, calls, logs } = mockCtx([{ status: 200, body: {} }], conn);
  await action.execute!({ by: "filter", filter: "year < 2000" }, ctx);
  assertEquals(calls[0].url, `${base}/delete`);
  assertEquals(JSON.parse(calls[0].body!), { filter: "year < 2000" });
  assertEquals(logs[0].level, "warn");
});

/** A blank filter must not become "delete everything". */
Deno.test("document-delete: each mode requires its own field, before any request", async () => {
  for (
    const [input, needle] of [
      [{ by: "id" }, "`documentId` is required"],
      [{ by: "ids" }, "`documentIds` is required"],
      [{ by: "filter" }, "`filter` is required"],
      [{ by: "everything" }, "`by` must be"],
    ] as const
  ) {
    const { ctx, calls } = mockCtx([], conn);
    await assertRejects(async () => await action.execute!(input, ctx), Error, needle);
    assertEquals(calls.length, 0);
  }
});

/** A filter is an expression, not JSON — but the array form must still parse. */
Deno.test("document-delete: an array filter is parsed, a string expression is not", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], conn);
  await action.execute!({ by: "filter", filter: '[["genres = horror"]]' }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { filter: [["genres = horror"]] });
});

Deno.test("document-delete: the empty-filter error points at the right action", async () => {
  const { ctx } = mockCtx([], conn);
  const err = await assertRejects(
    async () => await action.execute!({ by: "filter" }, ctx),
    Error,
  );
  assertEquals(err.message.includes("Clear Documents"), true);
});
