import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import findSubscriberBySystemField from "../../actions/find-subscriber-by-system-field.ts";

Deno.test("find-subscriber-by-system-field: by email sends only email", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success", data: { id: "1" } } }]);
  await findSubscriberBySystemField.execute!({ email: "a@x.com" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/fb/subscriber/findBySystemField");
  assertEquals(url.searchParams.get("email"), "a@x.com");
  assert(!url.searchParams.has("phone"));
});

Deno.test("find-subscriber-by-system-field: by phone sends only phone", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success", data: { id: "1" } } }]);
  await findSubscriberBySystemField.execute!({ phone: "+15551234567" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("phone"), "+15551234567");
  assert(!url.searchParams.has("email"));
});

Deno.test("find-subscriber-by-system-field: refuses both — Manychat says set ONE", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(
    async () => {
      await findSubscriberBySystemField.execute!({ email: "a@x.com", phone: "+1555" }, ctx);
    },
    Error,
  );
  assert(err.message.includes("exactly one"), err.message);
  assertEquals(calls.length, 0);
});

Deno.test("find-subscriber-by-system-field: refuses neither", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => {
      await findSubscriberBySystemField.execute!({}, ctx);
    },
    Error,
  );
  assertEquals(calls.length, 0);
});

Deno.test("find-subscriber-by-system-field: returns a single object, not a list", async () => {
  const { ctx } = mockCtx([
    { body: { status: "success", data: { id: "1", email: "a@x.com" } } },
  ]);
  const out = await findSubscriberBySystemField.execute!({ email: "a@x.com" }, ctx) as {
    data: { email: string };
  };
  assert(!Array.isArray(out.data));
  assertEquals(out.data.email, "a@x.com");
});
