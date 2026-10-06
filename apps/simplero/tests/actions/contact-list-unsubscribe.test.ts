import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/contact-list-unsubscribe.ts";
import { actionBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-list-unsubscribe: is a non-idempotent perform action on the contact id", () => {
  assertEquals(action.key, "contact-list-unsubscribe");
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
  assertEquals(action.params![0].key, "id");
  assertEquals(action.params![0].required, true);
});

Deno.test("contact-list-unsubscribe: POSTs /customers/11/actions/list_unsubscribe with the mapped body", async () => {
  const { ctx, calls } = mockCtx([{ body: actionBody(true, "done") }]);
  const out = await action.execute({ id: 11, listId: 4 }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/customers/11/actions/list_unsubscribe");
  assertEquals(JSON.parse(calls[0].body!), { "list_id": 4 });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(out, { success: true, message: "done" });
});

Deno.test("contact-list-unsubscribe: HTTP 200 with success:false is a failure, not a result", async () => {
  const { ctx } = mockCtx([{ body: actionBody(false, "Contact not found") }]);
  await assertRejects(
    async () => await action.execute({ id: 11, listId: 4 }, ctx),
    Error,
    "Contact not found",
  );
});

Deno.test("contact-list-unsubscribe: a 422 surfaces the errors array", async () => {
  const { ctx } = mockCtx([{ status: 422, body: { errors: ["bad one", "bad two"] } }]);
  await assertRejects(
    async () => await action.execute({ id: 11, listId: 4 }, ctx),
    Error,
    "bad one; bad two",
  );
});

Deno.test("contact-list-unsubscribe: a 200 without a success flag is an error", async () => {
  const { ctx } = mockCtx([{ body: { data: {} } }]);
  await assertRejects(
    async () => await action.execute({ id: 11, listId: 4 }, ctx),
    Error,
    "data.success",
  );
});
