import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import contactGet from "../../actions/contact-get.ts";
import { envelope, errorBody, mockCtx, pathOf } from "../_helpers.ts";

test("contact-get: GET /v1/funnels/{f}/contacts/{c}", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "c1", status: "lead" }) }]);
  const out = await contactGet.execute({ funnelId: "f1", contactId: "c1" }, ctx) as {
    data: { id: string };
  };
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/funnels/f1/contacts/c1");
  assertEquals(out.data.id, "c1");
});

test("contact-get: requires both ids", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(() =>
    Promise.resolve(contactGet.execute({ funnelId: "f", contactId: " " }, ctx))
  );
});

test("contact-get: a 404 surfaces the vendor message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody("Contact not found", 404) }]);
  const err = await assertRejects(() =>
    Promise.resolve(contactGet.execute({ funnelId: "f", contactId: "x" }, ctx))
  );
  assertEquals((err as Error).message, "Perspective 404: Contact not found");
});
