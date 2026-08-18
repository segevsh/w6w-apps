import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/similar-documents.ts";

const conn = { display: { baseUrl: "https://search.example.com", indexUid: "movies" } };

Deno.test("similar-documents: POSTs the document id and embedder", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { hits: [] } }], conn);
  await action.execute!({ id: "42", embedder: "default" }, ctx);
  assertEquals(calls[0].url, "https://search.example.com/indexes/movies/similar");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.id, "42");
  assertEquals(body.embedder, "default");
  assertEquals(body.offset, 0);
});

/** Similarity here is vector similarity — there is no keyword fallback. */
Deno.test("similar-documents: an embedder is required, and says why", async () => {
  const { ctx, calls } = mockCtx([], conn);
  const err = await assertRejects(
    async () => await action.execute!({ id: "42", embedder: "" }, ctx),
    Error,
  );
  assert(err.message.includes("vector similarity"), err.message);
  assertEquals(calls.length, 0);
});

Deno.test("similar-documents: a blank document id fails before any request", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ embedder: "default" }, ctx),
    Error,
    "`id` is required",
  );
  assertEquals(calls.length, 0);
});
