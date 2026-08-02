import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-outbound-message.ts";

Deno.test("get-outbound-message: GETs /messages/outbound/{id}/details", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { MessageID: "abc-123", Subject: "Hi" } }]);
  await action.execute({ messageId: "abc-123" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/messages/outbound/abc-123/details");
});

Deno.test("get-outbound-message: throws without a messageId", async () => {
  const { ctx } = mockCtx();
  await assertRejects(
    () => Promise.resolve(action.execute({ messageId: "" }, ctx)),
    Error,
    "messageId",
  );
});
