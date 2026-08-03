import { assertEquals } from "@std/assert";
import action from "../../actions/add-subscriber-to-sequence.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("add-subscriber-to-sequence: POSTs to /v4/sequences/{sequence_id}/subscribers", async () => {
  const { ctx, calls } = mockCtx([{ body: { subscriber: { id: 1 } } }]);
  await action.execute!({ sequenceId: 3, emailAddress: "ada@example.com" }, ctx);
  assertEquals(calls[0].url, "https://api.kit.com/v4/sequences/3/subscribers");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { email_address: "ada@example.com" });
});

Deno.test("add-subscriber-to-sequence: is idempotent", () => {
  assertEquals(action.idempotent, true);
});

Deno.test("add-subscriber-to-sequence: surfaces a 404 for an unknown subscriber", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    statusText: "Not Found",
    body: { errors: ["Not Found"] },
  }]);
  let threw = false;
  try {
    await action.execute!({ sequenceId: 3, emailAddress: "nobody@example.com" }, ctx);
  } catch (e) {
    threw = true;
    assertEquals((e as Error).message.includes("Kit 404"), true);
  }
  assertEquals(threw, true);
});
