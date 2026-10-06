import { assert, assertEquals, assertRejects } from "@std/assert";
import documentMerge from "../../actions/document-merge.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("document-merge: POST /api/documents/merge/{key}", async () => {
  const { ctx, calls } = mockCtx([{ body: "{\n \"message\": 'merge queued!',\n}" }]);
  const out = await documentMerge.execute(
    { "key": "1t1dLlvckO", "data": { "customer_name": "Ada" } } as never,
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/documents/merge/1t1dLlvckO");
  assert(typeof (out as { message: string }).message === "string");
});

Deno.test("document-merge: the data object is the request body, verbatim", async () => {
  const { ctx, calls } = mockCtx([{ body: { message: "queued" } }]);
  await documentMerge.execute(
    { "key": "1t1dLlvckO", "data": { "customer_name": "Ada" } } as never,
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), { customer_name: "Ada" });
});

Deno.test("document-merge: with no data it sends no body", async () => {
  const { ctx, calls } = mockCtx([{ body: { message: "queued" } }]);
  await documentMerge.execute({ key: "k1" } as never, ctx);
  assertEquals(calls[0].body, null);
  assertEquals(pathOf(calls[0].url).endsWith("/k1"), true);
});

Deno.test("document-merge: a text/plain answer is returned as { message }", async () => {
  const { ctx } = mockCtx([{ body: "queued ok", headers: { "content-type": "text/plain" } }]);
  assertEquals(await documentMerge.execute({ key: "k1" } as never, ctx), { message: "queued ok" });
});

Deno.test("document-merge: non-object data is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(documentMerge.execute({ key: "k1", data: "[1]" } as never, ctx)),
    Error,
    "JSON object",
  );
  assertEquals(calls.length, 0);
});

Deno.test("document-merge: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("Unauthenticated.") }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        documentMerge.execute(
          { "key": "1t1dLlvckO", "data": { "customer_name": "Ada" } } as never,
          ctx,
        ),
      ),
    Error,
  );
  assert(err.message.includes("Unauthenticated."), err.message);
  assert(err.message.includes("401"), err.message);
});

Deno.test("document-merge: idempotency is declared as false", () =>
  assertEquals(documentMerge.idempotent, false));
