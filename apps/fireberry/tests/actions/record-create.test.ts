import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/record-create.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("record-create: sends POST /api/record/{object} with the fields as the body", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      success: true,
      data: { Record: { accountid: "a1", accountname: "Acme" } },
      message: "",
    },
  }]);
  const out = await action.execute!({ object: "account", fields: { accountname: "Acme" } }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/record/account");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { accountname: "Acme" });
  assertEquals(out, { record: { accountid: "a1", accountname: "Acme" } });
});

Deno.test("record-create: accepts the fields as JSON text from a form field", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, data: { Record: {} } } }]);
  await action.execute!({ object: "task", fields: '{"subject":"Call"}' }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { subject: "Call" });
});

Deno.test("record-create: rejects fields that are not an object before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ object: "task", fields: "[1]" }, ctx),
    Error,
    "JSON object",
  );
  assertEquals(calls.length, 0);
});

Deno.test("record-create: sends no tokenid header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, data: { Record: {} } } }]);
  await action.execute!({ object: "account", fields: { accountname: "A" } }, ctx);
  assert(!("tokenid" in calls[0].headers));
});

Deno.test("record-create: a 2xx with success:false is thrown, not returned", async () => {
  const { ctx } = mockCtx([{ body: { success: false, message: "Could not create record" } }]);
  await assertRejects(
    async () => await action.execute!({ object: "account", fields: { a: 1 } }, ctx),
    Error,
    "Could not create record",
  );
});

Deno.test("record-create: is not idempotent", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
});
