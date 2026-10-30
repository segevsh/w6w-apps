import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import contactUpdate from "../../actions/contact-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("contact-update: PUTs /contact/{identifier} with only the supplied fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { contactId: 1 } }]);
  const out = await contactUpdate.execute(
    { identifier: "id:1", firstName: "Ada Marie" },
    ctx,
  ) as { contactId: number };

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v2/contact/id:1");
  assertEquals(JSON.parse(calls[0].body!), { firstName: "Ada Marie" });
  assertEquals(out.contactId, 1);
});

test("contact-update: is declared idempotent — PUT semantics make a retry safe", () => {
  assertEquals(contactUpdate.idempotent, true);
});
