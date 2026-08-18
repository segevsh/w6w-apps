import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/document-delete.ts";

const conn = { display: { projectId: "abc123", dataset: "production" } };
const ok = { status: 200, body: { transactionId: "t1", results: [] } };

/** Deleting a published document leaves its draft behind. */
Deno.test("document-delete: removes the draft alongside the published document", async () => {
  const { ctx, calls } = mockCtx([ok], conn);
  await action.execute!({ ids: "article-1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).mutations, [
    { delete: { id: "article-1" } },
    { delete: { id: "drafts.article-1" } },
  ]);
});

Deno.test("document-delete: the draft sweep can be turned off", async () => {
  const { ctx, calls } = mockCtx([ok], conn);
  await action.execute!({ ids: "article-1", alsoDeleteDrafts: false }, ctx);
  assertEquals(JSON.parse(calls[0].body!).mutations, [{ delete: { id: "article-1" } }]);
});

Deno.test("document-delete: naming ids needs no confirmation", async () => {
  const { ctx, calls } = mockCtx([ok], conn);
  await action.execute!({ ids: "a" }, ctx);
  assertEquals(calls.length, 1);
});

/** A query delete's scope is unknown until afterwards. */
Deno.test("document-delete: a query delete without confirmation is refused", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ query: '*[_type == "old"]' }, ctx),
    Error,
    "confirm",
  );
  assertEquals(calls.length, 0);
});

/** Purge destroys the history that makes a delete recoverable. */
Deno.test("document-delete: purging without confirmation is refused, with the reason", async () => {
  const { ctx } = mockCtx([], conn);
  const err = await assertRejects(
    async () => await action.execute!({ ids: "a", purge: true }, ctx),
    Error,
  );
  assert(/transaction history/.test(String(err)), String(err));
});

Deno.test("document-delete: confirmed, purge reaches every mutation", async () => {
  const { ctx, calls } = mockCtx([ok], conn);
  await action.execute!({ ids: "a", purge: true, confirm: true, alsoDeleteDrafts: false }, ctx);
  assertEquals(JSON.parse(calls[0].body!).mutations, [{ delete: { id: "a", purge: true } }]);
});

Deno.test("document-delete: ids and a query together are refused", async () => {
  const { ctx } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ ids: "a", query: "*", confirm: true }, ctx),
    Error,
    "not both",
  );
});
