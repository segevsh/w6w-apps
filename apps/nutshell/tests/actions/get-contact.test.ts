import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import getContact from "../../actions/get-contact.ts";
import { mockCtx, rpcBody } from "../_helpers.ts";

test("get-contact: is a read action requiring contactId", () => {
  assertEquals(getContact.type, "read");
  assertEquals(getContact.params?.find((p) => p.key === "contactId")?.required, true);
});

test("get-contact: calls getContact with a numeric contactId", async () => {
  const { ctx, calls } = mockCtx([{ result: { id: 12, name: "Andy Fowler" } }]);
  const result = await getContact.execute({ contactId: "12" }, ctx);

  assertEquals(rpcBody(calls[0]).method, "getContact");
  assertEquals(rpcBody(calls[0]).params, { contactId: 12 });
  assertEquals(result.name, "Andy Fowler");
});
