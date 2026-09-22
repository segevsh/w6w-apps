import { assertEquals } from "@std/assert";
import contactTagList from "../../actions/contact-tag-list.ts";
import { mockCtx, page, pathOf } from "../_helpers.ts";

Deno.test("contact-tag-list: GETs /contact-tags with no parameters", async () => {
  const { ctx, calls } = mockCtx([
    { body: page([{ id: 1, name: "vip", contacts_count: 3 }]) },
  ]);
  const out = await contactTagList.execute({}, ctx) as { data: unknown[] };

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.sendfox.com/contact-tags");
  assertEquals(pathOf(calls[0].url), "/contact-tags");
  assertEquals(out.data.length, 1);
});
