import { assertEquals } from "@std/assert";
import contactUpdate from "../../actions/contact-update.ts";
import { bodyOf, doc, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-update: PATCHes only the fields that were filled in", async () => {
  const { ctx, calls } = mockCtx([{ body: doc("5") }]);
  await contactUpdate.execute({ id: "5", email: "new@x.com" }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0]), "/v1/contacts/5");

  const body = bodyOf(calls[0]) as {
    data: { id: string; type: string; attributes: Record<string, unknown> };
  };
  assertEquals(body.data.id, "5");
  assertEquals(body.data.type, "contacts");
  // Only `email` — a client that sent every key would blank the rest.
  assertEquals(Object.keys(body.data.attributes), ["email"]);
});

Deno.test("contact-update: offers external_user_id, which create cannot", async () => {
  const { ctx, calls } = mockCtx([{ body: doc("5") }]);
  await contactUpdate.execute({ id: "5", externalUserId: "ext-1" }, ctx);
  const attrs = (bodyOf(calls[0]) as { data: { attributes: Record<string, unknown> } })
    .data.attributes;
  assertEquals(attrs.external_user_id, "ext-1");
});

Deno.test("contact-update: a false boolean is a value, not an absence", async () => {
  const { ctx, calls } = mockCtx([{ body: doc("5") }]);
  await contactUpdate.execute({ id: "5", subscribed: false }, ctx);
  const attrs = (bodyOf(calls[0]) as { data: { attributes: Record<string, unknown> } })
    .data.attributes;
  assertEquals(attrs.subscribed, false);
});

/**
 * Tags are deliberately not editable here — the spec's update schema puts
 * `relationships` outside `data`, which is not what JSON:API describes. The
 * unambiguous relationship endpoints are used instead, which also keeps the
 * additive and destructive operations visibly separate.
 */
Deno.test("contact-update: does not accept tags — those go through the relationship routes", () => {
  const keys = contactUpdate.params!.map((p) => p.key);
  assertEquals(keys.includes("tagIds"), false);
  assertEquals(keys.includes("tags"), false);
});
