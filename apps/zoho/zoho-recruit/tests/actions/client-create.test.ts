import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockRecruitCtx } from "../_helpers.ts";
import action from "../../actions/client-create.ts";

test("client-create: POSTs the fields wrapped in a data array", async () => {
  const { ctx, calls } = mockRecruitCtx([
    { body: { data: [{ code: "SUCCESS", status: "success", details: { id: "1" } }] } },
  ]);
  await action.execute({ fields: { Client_Name: "Avon Group" } }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/recruit/v2/Clients");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { data: [{ Client_Name: "Avon Group" }] });
});

test("client-create: not idempotent — every call creates a new record", () => {
  assertEquals(action.idempotent, false);
});
