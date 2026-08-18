import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-suppression-remove.ts";

/** Re-sending to a hard bounce damages sending reputation. */
Deno.test("contact-suppression-remove: refuses to run without confirmation", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ email: "a@x.com" }, ctx),
    Error,
    "damages sending reputation",
  );
  assertEquals(calls.length, 0);
});

Deno.test("contact-suppression-remove: with confirmation it DELETEs, logging at warn", async () => {
  const { ctx, calls, logs } = mockCtx([{ status: 200, body: { success: true } }]);
  await action.execute!({ email: "a@x.com", confirm: true }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).searchParams.get("email"), "a@x.com");
  assertEquals(logs[0].level, "warn");
});

Deno.test("contact-suppression-remove: an email is required, before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ confirm: true }, ctx),
    Error,
    "`email` is required",
  );
  assertEquals(calls.length, 0);
  assert(action.type === "perform");
});
