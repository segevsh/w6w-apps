import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockDeskCtx } from "../_helpers.ts";
import action from "../../actions/contact-delete.ts";

test("contact-delete: POSTs /contacts/moveToTrash with a contactIds array", async () => {
  const { ctx, calls } = mockDeskCtx([{ status: 204 }]);
  const out = await action.execute({ recordId: "7" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/contacts/moveToTrash");
  assertEquals(JSON.parse(calls[0].body!), { contactIds: ["7"] });
  assertEquals(out, { deleted: true });
});
