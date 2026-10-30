import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-message-opens.ts";

test("list-message-opens: GETs /messages/outbound/opens with count/offset defaults", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { TotalCount: 0, Opens: [] } }]);
  await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/messages/outbound/opens");
  assertEquals(url.searchParams.get("count"), "100");
  assertEquals(url.searchParams.get("offset"), "0");
});

test("list-message-opens: forwards recipient/tag/messageStream/platform filters", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute(
    { recipient: "bob@x.com", tag: "welcome", messageStream: "outbound", platform: "mobile" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("recipient"), "bob@x.com");
  assertEquals(url.searchParams.get("tag"), "welcome");
  assertEquals(url.searchParams.get("messagestream"), "outbound");
  assertEquals(url.searchParams.get("platform"), "mobile");
});
