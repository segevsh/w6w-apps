import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-delete.ts";

Deno.test("contact-delete: deletes by id or email", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "c_1", deleted: true } }], {
    display: {},
  });
  const result = await action.execute!({ contact: "c_1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, "https://api.resend.com/contacts/c_1");
  assertEquals(result, { id: "c_1", deleted: true });
});

Deno.test("contact-delete: a blank identifier fails before any request", async () => {
  const { ctx, calls } = mockCtx([], { display: {} });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`contact`");
  assertEquals(calls.length, 0);
});
