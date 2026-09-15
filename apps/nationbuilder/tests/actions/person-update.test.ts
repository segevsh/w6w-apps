import { assertEquals } from "@std/assert";
import { mockNationBuilderCtx } from "../_helpers.ts";
import action from "../../actions/person-update.ts";

Deno.test("person-update: PATCHes /signups/{id} with only the fields set", async () => {
  const { ctx, calls } = mockNationBuilderCtx([{
    body: { data: { id: "42", type: "signups", attributes: { first_name: "Kimberly" } } },
  }]);
  const out = await action.execute({ personId: "42", firstName: "Kimberly" }, ctx);
  assertEquals(calls[0].url, "https://acme.nationbuilder.com/api/v2/signups/42");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), {
    data: { type: "signups", id: "42", attributes: { first_name: "Kimberly" } },
  });
  assertEquals(out, { id: "42", type: "signups", first_name: "Kimberly" });
});

Deno.test("person-update: is idempotent", () => {
  assertEquals(action.idempotent, true);
});
