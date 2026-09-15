import { assertEquals } from "@std/assert";
import { mockMocoCtx } from "../_helpers.ts";
import action from "../../actions/contact-get.ts";

Deno.test("contact-get: GETs /contacts/people/:id", async () => {
  const { ctx, calls } = mockMocoCtx([{ body: { id: 4, firstname: "Max", lastname: "Muster" } }]);
  const out = await action.execute({ contactId: 4 }, ctx);
  assertEquals(calls[0].url, "https://acme.mocoapp.com/api/v1/contacts/people/4");
  assertEquals(out, { id: 4, firstname: "Max", lastname: "Muster" });
});
