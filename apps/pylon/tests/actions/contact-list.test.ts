import { assertEquals } from "@std/assert";
import action from "../../actions/contact-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("contact-list: GETs /contacts with cursor and limit", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: [{ id: "c1" }], pagination: { cursor: "n", has_next_page: true } },
  }]);
  const out = await action.execute!({ cursor: "c", limit: 2 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://api.usepylon.com/contacts");
  assertEquals(Object.fromEntries(url.searchParams), { cursor: "c", limit: "2" });
  assertEquals(out, { contacts: [{ id: "c1" }], hasNextPage: true, nextCursor: "n" });
});
