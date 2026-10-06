import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/record-update.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("record-update: sends PUT /api/record/{object}/{id} with the fields as the body", async () => {
  const { ctx, calls } = mockCtx([{
    body: { success: true, data: { Record: { accountid: "a1", accountname: "New" } }, message: "" },
  }]);
  const out = await action.execute!(
    { object: "account", recordId: "a1", fields: { accountname: "New" } },
    ctx,
  );
  assertEquals(new URL(calls[0].url).pathname, "/api/record/account/a1");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { accountname: "New" });
  assertEquals(out, { record: { accountid: "a1", accountname: "New" } });
});

Deno.test("record-update: accepts JSON text and keeps null (which clears a field)", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, data: { Record: {} } } }]);
  await action.execute!({ object: "contact", recordId: "c1", fields: '{"telephone1":null}' }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { telephone1: null });
});

Deno.test("record-update: rejects non-object fields before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ object: "a", recordId: "1", fields: "nope" }, ctx),
    Error,
    "JSON object",
  );
  assertEquals(calls.length, 0);
});

Deno.test("record-update: sends no tokenid header and surfaces vendor errors", async () => {
  const ok = mockCtx([{ body: { success: true, data: { Record: {} } } }]);
  await action.execute!({ object: "a", recordId: "1", fields: { x: 1 } }, ok.ctx);
  assert(!("tokenid" in ok.calls[0].headers));
  const bad = mockCtx([{
    status: 400,
    body: { Message: "Could not create record. Check your data" },
  }]);
  await assertRejects(
    async () => await action.execute!({ object: "a", recordId: "1", fields: { x: 1 } }, bad.ctx),
    Error,
    "Check your data",
  );
});

Deno.test("record-update: is idempotent", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
});
