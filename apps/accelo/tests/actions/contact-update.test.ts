import { assertEquals, assertRejects } from "@std/assert";
import { mockAcceloCtx } from "../_helpers.ts";
import action from "../../actions/contact-update.ts";

Deno.test("contact-update: PUTs only the changed fields to /contacts/{id}", async () => {
  const { ctx, calls } = mockAcceloCtx([{
    body: { meta: { status: "ok" }, response: { id: "8" } },
  }]);
  const out = await action.execute(
    { contactId: 8, ...{ "surname": "Lee", "standing": "active" } },
    ctx,
  );
  assertEquals(out, { id: "8" });
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url, "https://acme.api.accelo.com/api/v0/contacts/8");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(Object.fromEntries(new URLSearchParams(calls[0].body ?? "")), {
    "surname": "Lee",
    "standing": "active",
  });
});

Deno.test("contact-update: refuses an update that sets nothing, without a request", async () => {
  const { ctx, calls } = mockAcceloCtx([]);
  await assertRejects(
    async () => await action.execute({ contactId: 8 }, ctx),
    Error,
    "at least one field",
  );
  assertEquals(calls.length, 0);
});
