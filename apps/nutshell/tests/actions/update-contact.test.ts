import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import updateContact from "../../actions/update-contact.ts";
import { mockCtx, rpcBody } from "../_helpers.ts";

test("update-contact: is a non-idempotent perform action requiring rev", () => {
  assertEquals(updateContact.type, "perform");
  assertEquals(updateContact.idempotent, false);
  assertEquals(updateContact.params?.find((p) => p.key === "rev")?.required, true);
});

test("update-contact: sends contactId, rev, and the contact diff", async () => {
  const { ctx, calls } = mockCtx([{ result: { id: 12, rev: "3" } }]);
  await updateContact.execute({ contactId: "12", rev: "2", note: "cool guy" }, ctx);

  assertEquals(rpcBody(calls[0]).method, "editContact");
  const params = rpcBody(calls[0]).params;
  assertEquals(params.contactId, 12);
  assertEquals(params.rev, "2");
  assertEquals(params.contact, { note: "cool guy" });
});
