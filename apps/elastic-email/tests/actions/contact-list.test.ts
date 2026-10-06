import { assertEquals } from "@std/assert";
import action from "../../actions/contact-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("contact-list: GET /contacts wraps the bare array and passes limit/offset", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ Email: "a@x.com" }, { Email: "b@x.com" }] }]);
  const out = await action.execute({ limit: 2, offset: 0 }, ctx) as {
    items: unknown[];
    count: number;
  };
  assertEquals(pathOf(calls[0].url), "/v4/contacts");
  assertEquals(queryOf(calls[0].url), { limit: "2", offset: "0" });
  assertEquals(out.count, 2);
  assertEquals(out.items.length, 2);
});

Deno.test("contact-list: no params sends no query string; empty page is count 0", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  const out = await action.execute({}, ctx) as { count: number };
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(out.count, 0);
});
