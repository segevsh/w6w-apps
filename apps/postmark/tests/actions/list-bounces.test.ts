import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-bounces.ts";

Deno.test("list-bounces: GETs /bounces with count/offset defaults", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { TotalCount: 0, Bounces: [] } }]);
  await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/bounces");
  assertEquals(url.searchParams.get("count"), "50");
  assertEquals(url.searchParams.get("offset"), "0");
});

Deno.test("list-bounces: forwards type/inactive/emailFilter/tag/messageId/date/stream filters", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute(
    {
      type: "HardBounce",
      inactive: true,
      emailFilter: "bob",
      tag: "welcome",
      messageId: "msg-1",
      fromdate: "2026-01-01",
      todate: "2026-01-31",
      messageStream: "outbound",
    },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("type"), "HardBounce");
  assertEquals(url.searchParams.get("inactive"), "true");
  assertEquals(url.searchParams.get("emailFilter"), "bob");
  assertEquals(url.searchParams.get("tag"), "welcome");
  assertEquals(url.searchParams.get("messageID"), "msg-1");
  assertEquals(url.searchParams.get("fromdate"), "2026-01-01");
  assertEquals(url.searchParams.get("todate"), "2026-01-31");
  assertEquals(url.searchParams.get("messagestream"), "outbound");
});
