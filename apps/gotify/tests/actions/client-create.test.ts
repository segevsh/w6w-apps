import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/client-create.ts";

const conn = { display: { baseUrl: "https://gotify.example.com" } };

test("client-create: POSTs name and expiresAfterInactivitySeconds", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { id: 2, name: "CLI", token: "gtfy.def" },
  }], conn);
  await action.execute!({ name: "CLI", expiresAfterInactivitySeconds: 2592000 }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, { name: "CLI", expiresAfterInactivitySeconds: 2592000 });
});

test("client-create: omits expiresAfterInactivitySeconds when unset", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 2, name: "CLI" } }], conn);
  await action.execute!({ name: "CLI" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals("expiresAfterInactivitySeconds" in body, false);
});

test("client-create: requires a non-empty name", async () => {
  const { ctx, calls } = mockCtx([], conn);
  let threw = false;
  try {
    await action.execute!({ name: "" }, ctx);
  } catch {
    threw = true;
  }
  assertEquals(threw, true);
  assertEquals(calls.length, 0);
});
