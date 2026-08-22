import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-get.ts";

Deno.test("contact-get: fetches by contact id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "cnt_1" } }]);
  assertEquals(await action.execute!({ contactId: "cnt_1" }, ctx), { id: "cnt_1" });
  assertEquals(new URL(calls[0].url).pathname, "/contacts/cnt_1");
});

/** The alias form is the only way to look somebody up by address. */
Deno.test("contact-get: a handle alias survives encoding", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "cnt_1" } }]);
  await action.execute!({ contactId: "alt:email:ada+test@example.com" }, ctx);
  const path = new URL(calls[0].url).pathname;
  assertEquals(decodeURIComponent(path), "/contacts/alt:email:ada+test@example.com");
  // The `+` must not survive as a literal plus, which a query parser would read
  // as a space.
  assertEquals(path.includes("%2B"), true);
});

Deno.test("contact-get: a missing id is refused", async () => {
  const { ctx } = mockCtx();
  await assertRejects(async () => await action.execute!({}, ctx), Error, "contactId");
});
