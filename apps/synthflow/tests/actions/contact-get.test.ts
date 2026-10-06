import { assertEquals } from "@std/assert";
import contactGet from "../../actions/contact-get.ts";
import { mockCtx, ok, pathOf } from "../_helpers.ts";

Deno.test("contact-get: GET /contacts/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: ok({ id: "ct1", name: "Ada" }) }]);
  assertEquals(await contactGet.execute({ contact_id: "ct1" }, ctx), { id: "ct1", name: "Ada" });
  assertEquals(pathOf(calls[0].url), "/v2/contacts/ct1");
});
