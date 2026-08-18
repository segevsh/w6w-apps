import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/document-patch.ts";

const conn = { display: { projectId: "abc123", dataset: "production" } };
const ok = { status: 200, body: { transactionId: "t1", results: [] } };

Deno.test("document-patch: builds a patch mutation by id", async () => {
  const { ctx, calls } = mockCtx([ok], conn);
  await action.execute!({ id: "a", set: '{"title":"New"}', unset: "old,legacy" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    mutations: [{ patch: { id: "a", set: { title: "New" }, unset: ["old", "legacy"] } }],
  });
});

Deno.test("document-patch: a query patch carries its parameters", async () => {
  const { ctx, calls } = mockCtx([ok], conn);
  await action.execute!({
    query: "*[_type == $t]",
    queryParams: '{"t":"article"}',
    inc: '{"views":1}',
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).mutations[0].patch, {
    query: "*[_type == $t]",
    params: { t: "article" },
    inc: { views: 1 },
  });
});

Deno.test("document-patch: an id AND a query is refused", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ id: "a", query: "*", set: "{}" }, ctx),
    Error,
    "one target",
  );
  assertEquals(calls.length, 0);
});

Deno.test("document-patch: a patch with no operations is refused", async () => {
  const { ctx } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ id: "a" }, ctx),
    Error,
    "nothing to change",
  );
});

/** The revision lock is per document; a query can match many. */
Deno.test("document-patch: a revision lock cannot be combined with a query", async () => {
  const { ctx } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ query: "*", set: "{}", ifRevisionId: "rev-1" }, ctx),
    Error,
    "single document",
  );
});

Deno.test("document-patch: the revision lock is sent as ifRevisionID", async () => {
  const { ctx, calls } = mockCtx([ok], conn);
  await action.execute!({ id: "a", set: "{}", ifRevisionId: "rev-1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).mutations[0].patch.ifRevisionID, "rev-1");
});

/** inc/dec make a retried patch count twice. */
Deno.test("document-patch: declares itself non-idempotent, and explains the order", () => {
  assertEquals(action.idempotent, false);
  assert(/set → setIfMissing → unset → inc → dec → insert/.test(action.description!));
});

/** Query mutations stop silently at 10,000 documents. */
Deno.test("document-patch: the query hint carries Sanity's silent ceiling", () => {
  const p = (action.params as Array<{ key: string; hint?: string }>).find((p) =>
    p.key === "query"
  )!;
  assert(/10,?000/.test(p.hint!), p.hint);
});
