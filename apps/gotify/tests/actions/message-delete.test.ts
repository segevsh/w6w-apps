import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/message-delete.ts";

const conn = { display: { baseUrl: "https://gotify.example.com" } };

Deno.test("message-delete: DELETEs /message/{id} when confirmed", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: "" }], conn);
  const result = await action.execute!({ id: 42, confirm: true }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/message/42");
  assertEquals(result, { deleted: true });
});

Deno.test("message-delete: refuses without confirm=true, before any fetch", async () => {
  const { ctx, calls } = mockCtx([], conn);
  let threw = false;
  try {
    await action.execute!({ id: 42, confirm: false }, ctx);
  } catch {
    threw = true;
  }
  assertEquals(threw, true);
  assertEquals(calls.length, 0);
});
