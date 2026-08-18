import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-update.ts";

Deno.test("contact-update: PUTs and upserts by email", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { success: true, id: "c1" } }]);
  await action.execute!({ email: "ada@example.com", firstName: "Ada" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url, "https://app.loops.so/api/v1/contacts/update");
  assertEquals(JSON.parse(calls[0].body!), { email: "ada@example.com", firstName: "Ada" });
  assertEquals(action.idempotent, true);
});

/**
 * Keyed by email alone, a new address creates a second contact rather than
 * renaming the first — so the combination is refused locally.
 */
Deno.test("contact-update: renaming an email without a userId is refused", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ email: "old@x.com", newEmail: "new@x.com" }, ctx),
    Error,
    "changing the email address needs a `userId`",
  );
  assertEquals(calls.length, 0);
});

Deno.test("contact-update: with a userId the rename goes through as the email field", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({ userId: "u1", newEmail: "new@x.com" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { userId: "u1", email: "new@x.com" });
});

/** "" means leave unchanged, so a profile edit cannot silently unsubscribe. */
Deno.test("contact-update: subscribed is tri-state", async () => {
  const unset = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({ email: "a@x.com", firstName: "A", subscribed: "" }, unset.ctx);
  assertEquals(JSON.parse(unset.calls[0].body!).subscribed, undefined);

  const off = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({ email: "a@x.com", subscribed: "false" }, off.ctx);
  assertEquals(JSON.parse(off.calls[0].body!).subscribed, false);

  const on = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({ email: "a@x.com", subscribed: "true" }, on.ctx);
  assertEquals(JSON.parse(on.calls[0].body!).subscribed, true);
});

Deno.test("contact-update: naming neither identity is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ firstName: "Ada" }, ctx),
    Error,
    "`contact-update` needs a contact",
  );
  assertEquals(calls.length, 0);
  assert(action.description!.includes("Upsert"), action.description);
});
