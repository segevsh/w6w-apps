import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-outbound-messages.ts";

Deno.test("list-outbound-messages: GETs /messages/outbound with count/offset defaults", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { TotalCount: 0, Messages: [] } }]);
  await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/messages/outbound");
  assertEquals(url.searchParams.get("count"), "100");
  assertEquals(url.searchParams.get("offset"), "0");
});

Deno.test("list-outbound-messages: forwards filters with the vendor's lowercase query names", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute(
    {
      recipient: "bob@x.com",
      fromEmail: "ada@x.com",
      tag: "welcome",
      status: "sent",
      subject: "Hi",
      fromdate: "2026-01-01",
      todate: "2026-01-31",
      messageStream: "outbound",
    },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("recipient"), "bob@x.com");
  assertEquals(url.searchParams.get("fromemail"), "ada@x.com");
  assertEquals(url.searchParams.get("tag"), "welcome");
  assertEquals(url.searchParams.get("status"), "sent");
  assertEquals(url.searchParams.get("subject"), "Hi");
  assertEquals(url.searchParams.get("fromdate"), "2026-01-01");
  assertEquals(url.searchParams.get("todate"), "2026-01-31");
  assertEquals(url.searchParams.get("messagestream"), "outbound");
});
