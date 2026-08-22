import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-delete.ts";

/** Deleting also loses the unsubscribe record — unsubscribing is usually meant. */
Deno.test("contact-delete: refuses to run without an explicit confirmation", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ email: "a@x.com" }, ctx),
    Error,
    "`confirm` must be true",
  );
  assertEquals(calls.length, 0);
});

Deno.test("contact-delete: with confirmation it POSTs the identity, logging at warn", async () => {
  const { ctx, calls, logs } = mockCtx([{ status: 200, body: { success: true } }]);
  await action.execute!({ email: "a@x.com", confirm: true }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://app.loops.so/api/v1/contacts/delete");
  assertEquals(JSON.parse(calls[0].body!), { email: "a@x.com" });
  assertEquals(logs[0].level, "warn");
});

Deno.test("contact-delete: naming neither identity is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ confirm: true }, ctx),
    Error,
    "`contact-delete` needs a contact",
  );
  assertEquals(calls.length, 0);
  assert(action.description!.includes("Unsubscribing"), action.description);
});
