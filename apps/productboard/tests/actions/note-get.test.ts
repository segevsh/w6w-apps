import { assertEquals } from "@std/assert";
import action from "../../actions/note-get.ts";
import { envelope, mockCtx, pathOf, queryAll } from "../_helpers.ts";

Deno.test("note-get: GETs the note by id and unwraps data", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "n-1", type: "textNote" }) }]);
  const out = await action.execute({ noteId: "n-1" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/notes/n-1");
  assertEquals(out.data, { id: "n-1", type: "textNote" });
});

Deno.test("note-get: the field selector is unbracketed here too", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({}) }]);
  await action.execute({ noteId: "n-1", fields: "all" }, ctx);
  assertEquals(queryAll(calls[0].url, "fields"), ["all"]);
  assertEquals(queryAll(calls[0].url, "fields[]"), []);
});

/**
 * A `[redacted]` value is a missing PII scope, not the customer's address. The
 * action passes the response through untouched so the caller can see it.
 */
Deno.test("note-get: a redacted PII value is passed through verbatim, not silently dropped", async () => {
  const { ctx } = mockCtx([{
    body: envelope({ id: "n-1", fields: { owner: { email: "[redacted]" } } }),
  }]);
  const out = await action.execute({ noteId: "n-1" }, ctx);
  assertEquals(
    (out.data as { fields: { owner: { email: string } } }).fields.owner.email,
    "[redacted]",
  );
});
