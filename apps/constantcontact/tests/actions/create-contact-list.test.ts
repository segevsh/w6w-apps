import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-contact-list.ts";

test("create-contact-list: POSTs /v3/contact_lists with just the name", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { list_id: "l1" } }]);
  await action.execute!({ name: "Newsletter" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v3/contact_lists");
  assertEquals(JSON.parse(calls[0].body!), { name: "Newsletter" });
});

test("create-contact-list: includes description and favorite when supplied", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await action.execute!({ name: "Newsletter", description: "monthly", favorite: true }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Newsletter",
    description: "monthly",
    favorite: true,
  });
});

test("create-contact-list: sends favorite: false explicitly when asked", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await action.execute!({ name: "Newsletter", favorite: false }, ctx);
  assertEquals(JSON.parse(calls[0].body!).favorite, false);
});

test("create-contact-list: is not idempotent — the name must be unique", () => {
  assertEquals(action.idempotent, false);
});
