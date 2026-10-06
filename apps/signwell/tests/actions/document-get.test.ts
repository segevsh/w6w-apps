import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/document-get.ts";

Deno.test("document-get: GETs /documents/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "d1", status: "Completed", recipients: [] } }]);
  const out = await action.execute!({ id: "d1" }, ctx);
  assertEquals(calls[0].url, "https://www.signwell.com/api/v1/documents/d1");
  assertEquals(calls[0].method, "GET");
  assertEquals(out, { id: "d1", status: "Completed", recipients: [] });
});

Deno.test("document-get: id is required, and a 404 is read from the vendor error code", async () => {
  const { ctx, calls } = mockCtx([{
    status: 404,
    body: {
      message: "Not found",
      meta: { error: "record_not_found", message: "Couldn't find the document requested" },
    },
  }]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`id` is required");
  assertEquals(calls.length, 0);
  const err = await assertRejects(async () => await action.execute!({ id: "nope" }, ctx));
  assert((err as Error).message.includes("record_not_found"), (err as Error).message);
});
