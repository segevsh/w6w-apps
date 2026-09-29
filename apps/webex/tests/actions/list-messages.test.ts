import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-messages.ts";

Deno.test("list-messages: GETs /messages with roomId", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [{ id: "m1" }] } }]);
  const result = await action.execute({ roomId: "r1" }, ctx);
  assertEquals(calls[0].url, "https://webexapis.com/v1/messages?roomId=r1");
  assertEquals(result, [{ id: "m1" }]);
});

Deno.test("list-messages: joins mentionedPeople as one comma-separated value", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await action.execute({ roomId: "r1", mentionedPeople: "me, p2" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("mentionedPeople"), "me,p2");
});
