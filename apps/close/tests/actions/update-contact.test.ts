import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-contact.ts";

Deno.test("update-contact: PUTs /contact/{id}/ with only the supplied fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "cont_1" } }]);
  await action.execute({ contactId: "cont_1", title: "CEO" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/contact/cont_1/");
  assertEquals(JSON.parse(calls[0].body!), { title: "CEO" });
});

Deno.test("update-contact: can move a contact to another lead", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute({ contactId: "cont_1", leadId: "lead_2" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { lead_id: "lead_2" });
});

Deno.test("update-contact: warns at the form that list fields replace rather than merge", () => {
  for (const key of ["emails", "phones", "urls"]) {
    const p = action.params?.find((p) => p.key === key)!;
    assert(/REPLACES/i.test(p.hint!), `${key} should warn about wholesale replacement`);
  }
  assertEquals(action.idempotent, true);
});
