import { assertEquals } from "@std/assert";
import contactTagList from "../../actions/contact-tag-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("contact-tag-list: GETs the relationship route", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [{ id: "3", type: "tags" }] } }]);
  await contactTagList.execute({ contactId: "9" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0]), "/v1/contacts/9/relationships/tags");
});

Deno.test("contact-tag-list: sends no pagination — the spec declares none on this route", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await contactTagList.execute({ contactId: "9" }, ctx);
  assertEquals(queryOf(calls[0]), {});
});

Deno.test("contact-tag-list: an id with a slash is percent-encoded", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await contactTagList.execute({ contactId: "a/b" }, ctx);
  assertEquals(pathOf(calls[0]), "/v1/contacts/a%2Fb/relationships/tags");
});
