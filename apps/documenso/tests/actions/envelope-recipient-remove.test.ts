import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/envelope-recipient-remove.ts";

const conn = { display: {} };

/** It takes the recipient's id, not the envelope's. */
Deno.test("envelope-recipient-remove: POSTs the recipient id, logging at warn", async () => {
  const { ctx, calls, logs } = mockCtx([{ status: 200, body: {} }], conn);
  const result = await action.execute!({ recipientId: 12 }, ctx);
  assertEquals(calls[0].url, "https://app.documenso.com/api/v2/envelope/recipient/delete");
  assertEquals(JSON.parse(calls[0].body!), { recipientId: 12 });
  assertEquals(result, { recipientId: 12, removed: true });
  assertEquals(logs[0].level, "warn");
});

Deno.test("envelope-recipient-remove: says their fields go too", () => {
  assert(action.description!.includes("along with their fields"), action.description);
});

Deno.test("envelope-recipient-remove: a missing id fails before any request", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`recipientId`");
  assertEquals(calls.length, 0);
});
