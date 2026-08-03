import { assertEquals } from "@std/assert";
import action from "../../actions/tag-subscriber.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("tag-subscriber: POSTs the email to /v4/tags/{tag_id}/subscribers", async () => {
  const { ctx, calls } = mockCtx([{ body: { subscriber: { id: 1276 } } }]);
  await action.execute!({ tagId: 284, emailAddress: "ada@example.com" }, ctx);
  assertEquals(calls[0].url, "https://api.kit.com/v4/tags/284/subscribers");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { email_address: "ada@example.com" });
});

Deno.test("tag-subscriber: is idempotent — re-tagging returns 200, not an error", () => {
  assertEquals(action.idempotent, true);
});

Deno.test("tag-subscriber: surfaces a 404 for a subscriber Kit does not know", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    statusText: "Not Found",
    body: { errors: ["Not Found"] },
  }]);
  let threw = false;
  try {
    await action.execute!({ tagId: 284, emailAddress: "nobody@example.com" }, ctx);
  } catch (e) {
    threw = true;
    assertEquals((e as Error).message.includes("Kit 404"), true);
  }
  assertEquals(threw, true);
});
