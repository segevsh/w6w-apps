import { assertEquals } from "@std/assert";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";
import action from "../../actions/contact-get-many.ts";

Deno.test("contact-get-many: GETs /contacts filtered by exact email", async () => {
  const { ctx, calls } = mockCtx([{ body: { results: [{ id: "c1", email: "a@b.com" }] } }]);
  const out = await action.execute({ email: "a@b.com" }, ctx);

  assertEquals(pathOf(calls[0]), "/public/v1/contacts");
  assertEquals(queryOf(calls[0]).get("email"), "a@b.com");
  assertEquals(out, { results: [{ id: "c1", email: "a@b.com" }] });
});

Deno.test("contact-get-many: omitting the email lists everything", async () => {
  const { ctx, calls } = mockCtx([{ body: { results: [] } }]);
  await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("contact-get-many: declares only the documented email filter — no invented paging", () => {
  assertEquals(action.params?.map((p) => p.key), ["email"]);
});

Deno.test("contact-get-many: is a search action on the contact resource", () => {
  assertEquals(action.type, "search");
  assertEquals(action.resource, "contact");
});
