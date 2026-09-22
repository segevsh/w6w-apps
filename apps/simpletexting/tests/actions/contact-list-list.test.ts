import { assertEquals } from "@std/assert";
import contactListList from "../../actions/contact-list-list.ts";
import { API_ROOT, mockCtx, page, queryOf } from "../_helpers.ts";

const LIST = { listId: "507f191e810c19729de860ea", name: "My First List", totalContactsCount: 10 };

Deno.test("contact-list-list: reads the contact-lists page and returns its rows", async () => {
  const { ctx, calls } = mockCtx([{ body: page([LIST], { totalElements: 1 }) }]);
  const result = await contactListList.execute({}, ctx) as { content: unknown[] };

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, `${API_ROOT}/api/contact-lists`);
  assertEquals(result.content, [LIST]);
});

Deno.test("contact-list-list: forwards page and size verbatim", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);
  await contactListList.execute({ page: 2, size: 10 }, ctx);
  assertEquals(queryOf(calls[0].url), { page: "2", size: "10" });
});

Deno.test("contact-list-list: is a search action grouped under contact-list", () => {
  assertEquals(contactListList.type, "search");
  assertEquals(contactListList.resource, "contact-list");
});
