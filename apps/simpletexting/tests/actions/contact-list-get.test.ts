import { assertEquals } from "@std/assert";
import contactListGet from "../../actions/contact-list-get.ts";
import { API_ROOT, mockCtx } from "../_helpers.ts";

const LIST = {
  listId: "507f191e810c19729de860ea",
  name: "My First List",
  description: null,
  totalContactsCount: 10,
  activeContactsCount: 9,
  invalidContactsCount: 1,
  unsubscribedContactsCount: 0,
  keywords: [],
};

Deno.test("contact-list-get: reads one list by name and returns it verbatim", async () => {
  const { ctx, calls } = mockCtx([{ body: LIST }]);
  const result = await contactListGet.execute({ listIdOrName: "My First List" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, `${API_ROOT}/api/contact-lists/My%20First%20List`);
  assertEquals(result, LIST);
});

Deno.test("contact-list-get: also addresses by hexadecimal id", async () => {
  const { ctx, calls } = mockCtx([{ body: LIST }]);
  await contactListGet.execute({ listIdOrName: "507f191e810c19729de860ea" }, ctx);
  assertEquals(calls[0].url, `${API_ROOT}/api/contact-lists/507f191e810c19729de860ea`);
});

Deno.test("contact-list-get: is a read action grouped under contact-list", () => {
  assertEquals(contactListGet.type, "read");
  assertEquals(contactListGet.resource, "contact-list");
});
