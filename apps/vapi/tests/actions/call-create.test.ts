import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import callCreate from "../../actions/call-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("call-create: posts assistantId + customer to POST /call", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "call1", status: "queued" } }]);
  const out = await callCreate.execute(
    {
      assistantId: "asst_1",
      phoneNumberId: "pn_1",
      customerNumber: "+14155551234",
      customerName: "Ada",
    },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/call");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, {
    assistantId: "asst_1",
    phoneNumberId: "pn_1",
    customer: { number: "+14155551234", name: "Ada" },
  });
  assertEquals(out, { id: "call1", status: "queued" });
});

test("call-create: omitting a customer number omits the customer object entirely", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "call1" } }]);
  await callCreate.execute({ assistantId: "asst_1" }, ctx);

  const body = JSON.parse(calls[0].body!);
  assertEquals("customer" in body, false);
});

test("call-create: assistantOverrides accepts a JSON string as well as an object", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "call1" } }]);
  await callCreate.execute(
    { assistantId: "asst_1", assistantOverrides: '{"variableValues":{"name":"Ada"}}' },
    ctx,
  );

  const body = JSON.parse(calls[0].body!);
  assertEquals(body.assistantOverrides, { variableValues: { name: "Ada" } });
});

test("call-create: is not idempotent — every call starts a new billed run", () => {
  assertEquals(callCreate.idempotent, false);
});
