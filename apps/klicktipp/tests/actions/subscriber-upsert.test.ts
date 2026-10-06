import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/subscriber-upsert.ts";

Deno.test("subscriber-upsert: POSTs the documented body keys", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "9", email: "a@example.com" } }]);
  const out = await action.execute(
    {
      email: "a@example.com",
      optinId: 12,
      tagId: 3,
      fields: { fieldFirstName: "Alex", field1: 5 },
    },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.klicktipp.com/subscriber");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), {
    email: "a@example.com",
    listid: 12,
    tagid: 3,
    fields: { fieldFirstName: "Alex", field1: "5" },
  });
  assertEquals(out, { subscriber: { id: "9", email: "a@example.com" } });
});

Deno.test("subscriber-upsert: needs an email or an SMS number", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute({}, ctx), Error, "email or an SMS number");
  assertEquals(calls.length, 0);
});

Deno.test("subscriber-upsert: field validation errors name the field", async () => {
  const { ctx } = mockCtx([{
    status: 406,
    body: { error: 8, name: "fieldLeadValue", reason: "must be a numeric value", field_value: "A" },
  }]);
  await assertRejects(
    async () =>
      await action.execute({ email: "a@example.com", fields: '{"fieldLeadValue":"A"}' }, ctx),
    Error,
    'invalid value for field "fieldLeadValue"',
  );
});
