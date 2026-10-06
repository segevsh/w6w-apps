import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/contact-site-grant.ts";
import { actionBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-site-grant: is a non-idempotent perform action on the contact id", () => {
  assertEquals(action.key, "contact-site-grant");
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
  assertEquals(action.params![0].key, "id");
  assertEquals(action.params![0].required, true);
});

Deno.test("contact-site-grant: POSTs /customers/11/actions/site_grant with the mapped body", async () => {
  const { ctx, calls } = mockCtx([{ body: actionBody(true, "done") }]);
  const out = await action.execute({ id: 11, siteId: 6, sendLoginEmail: true }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/customers/11/actions/site_grant");
  assertEquals(JSON.parse(calls[0].body!), { "site_id": 6, "send_login_email": true });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(out, { success: true, message: "done" });
});

Deno.test("contact-site-grant: HTTP 200 with success:false is a failure, not a result", async () => {
  const { ctx } = mockCtx([{ body: actionBody(false, "Contact not found") }]);
  await assertRejects(
    async () => await action.execute({ id: 11, siteId: 6, sendLoginEmail: true }, ctx),
    Error,
    "Contact not found",
  );
});

Deno.test("contact-site-grant: a 422 surfaces the errors array", async () => {
  const { ctx } = mockCtx([{ status: 422, body: { errors: ["bad one", "bad two"] } }]);
  await assertRejects(
    async () => await action.execute({ id: 11, siteId: 6, sendLoginEmail: true }, ctx),
    Error,
    "bad one; bad two",
  );
});

Deno.test("contact-site-grant: a 200 without a success flag is an error", async () => {
  const { ctx } = mockCtx([{ body: { data: {} } }]);
  await assertRejects(
    async () => await action.execute({ id: 11, siteId: 6, sendLoginEmail: true }, ctx),
    Error,
    "data.success",
  );
});
