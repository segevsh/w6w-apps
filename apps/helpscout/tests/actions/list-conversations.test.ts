import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-conversations.ts";

Deno.test("list-conversations: GETs /conversations with the filter params mapped", async () => {
  const { ctx, calls } = mockCtx([{ body: { _embedded: { conversations: [{ id: 1 }] } } }]);
  const out = await action.execute({
    mailboxId: 123,
    status: "closed",
    tag: "vip",
    page: 2,
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/conversations");
  assertEquals(url.searchParams.get("mailbox"), "123");
  assertEquals(url.searchParams.get("status"), "closed");
  assertEquals(url.searchParams.get("tag"), "vip");
  assertEquals(url.searchParams.get("page"), "2");
  assertEquals(out, { conversations: [{ id: 1 }] });
});

Deno.test("list-conversations: returns an empty array when _embedded is absent", async () => {
  const { ctx } = mockCtx([{ body: {} }]);
  const out = await action.execute({}, ctx);
  assertEquals(out, { conversations: [] });
});
