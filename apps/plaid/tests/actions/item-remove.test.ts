import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/item-remove.ts";

const conn = { display: { environment: "sandbox" } };

Deno.test("item-remove: refuses without confirmation, and says what breaks", async () => {
  const { ctx, calls } = mockCtx([], conn);
  const err = await assertRejects(
    async () => await action.execute!({ accessToken: "tok" }, ctx),
    Error,
  );
  assert(/reconnect their bank/.test(String(err)), String(err));
  assertEquals(calls.length, 0);
});

Deno.test("item-remove: confirmed, it removes the Item", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { request_id: "r1" } }], conn);
  const out = await action.execute!({ accessToken: "tok", confirm: true }, ctx) as { ok: boolean };
  assertEquals(out.ok, true);
  assertEquals(new URL(calls[0].url).pathname, "/item/remove");
});

/** It is what "delete my account" should mean for a connected bank. */
Deno.test("item-remove: says a new Item would have a new id", () => {
  assert(/new id/.test(action.description!), action.description);
});
