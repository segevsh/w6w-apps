import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/document-create.ts";

const conn = { display: { projectId: "abc123", dataset: "production", useCdn: true } };
const ok = { status: 200, body: { transactionId: "t1", results: [] } };

Deno.test("document-create: wraps the document in the chosen mutation mode", async () => {
  const { ctx, calls } = mockCtx([ok], conn);
  await action.execute!(
    { mode: "createIfNotExists", document: '{"_id":"a","_type":"article","title":"T"}' },
    ctx,
  );
  assertEquals(new URL(calls[0].url).pathname, "/v2025-02-19/data/mutate/production");
  assertEquals(JSON.parse(calls[0].body!), {
    mutations: [{ createIfNotExists: { _id: "a", _type: "article", title: "T" } }],
  });
});

/** The CDN rejects any POST that is not a query. */
Deno.test("document-create: a write goes to the live host even on a CDN connection", async () => {
  const { ctx, calls } = mockCtx([ok], conn);
  await action.execute!({ mode: "create", document: '{"_type":"article"}' }, ctx);
  assertEquals(new URL(calls[0].url).host, "abc123.api.sanity.io");
});

Deno.test("document-create: a document without _type is refused", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ mode: "create", document: '{"title":"T"}' }, ctx),
    Error,
    "_type",
  );
  assertEquals(calls.length, 0);
});

/** Replacing nothing is just a create — and silently loses the intent. */
Deno.test("document-create: createOrReplace without an _id is refused", async () => {
  const { ctx } = mockCtx([], conn);
  await assertRejects(
    async () =>
      await action.execute!({ mode: "createOrReplace", document: '{"_type":"article"}' }, ctx),
    Error,
    "_id",
  );
});

Deno.test("document-create: dry run and visibility reach the query string", async () => {
  const { ctx, calls } = mockCtx([ok], conn);
  await action.execute!({
    mode: "create",
    document: '{"_type":"article"}',
    dryRun: true,
    visibility: "async",
  }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("dryRun"), "true");
  assertEquals(q.get("visibility"), "async");
  // Array items need a _key to be editable in the Studio.
  assertEquals(q.get("autoGenerateArrayKeys"), "true");
});

/** Only two of the three modes are idempotent, and this is one action. */
Deno.test("document-create: declares itself non-idempotent, and says replace is not a merge", () => {
  assertEquals(action.idempotent, false);
  assert(/not a merge|omitted fields are deleted/i.test(action.description!), action.description);
});
