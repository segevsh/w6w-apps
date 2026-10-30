import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/message-delete-all.ts";

const conn = { display: { baseUrl: "https://gotify.example.com" } };

test("message-delete-all: DELETEs /message when applicationId is unset", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: "" }], conn);
  await action.execute!({ confirm: true }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/message");
});

test("message-delete-all: scopes to /application/{id}/message when set", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: "" }], conn);
  await action.execute!({ applicationId: 9, confirm: true }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/application/9/message");
});

test("message-delete-all: refuses without confirm=true, before any fetch", async () => {
  const { ctx, calls } = mockCtx([], conn);
  let threw = false;
  try {
    await action.execute!({}, ctx);
  } catch {
    threw = true;
  }
  assertEquals(threw, true);
  assertEquals(calls.length, 0);
});
