import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/contact-create.ts";
import { mockCtx, pathOf, recordBody } from "../_helpers.ts";

Deno.test("contact-create: is a non-idempotent perform action requiring only email", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
  const required = action.params!.filter((p) => p.required).map((p) => p.key);
  assertEquals(required, ["email"]);
});

Deno.test("contact-create: POSTs /customers with snake_case fields and returns the record", async () => {
  const { ctx, calls } = mockCtx([{ body: recordBody({ id: 77, email: "a@b.co" }) }]);
  const out = await action.execute({
    email: "a@b.co",
    firstNames: "Ada",
    lastName: "Lovelace",
    phoneNumber: "+15550100",
    locale: "en",
    doNotContact: false,
    doNotSms: true,
    gdprConsent: true,
  }, ctx) as { record: { id: number } };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/customers");
  assertEquals(JSON.parse(calls[0].body!), {
    email: "a@b.co",
    first_names: "Ada",
    last_name: "Lovelace",
    phone_number: "+15550100",
    locale: "en",
    do_not_contact: false,
    do_not_sms: true,
    gdpr_consent: true,
  });
  assertEquals(out.record.id, 77);
});

Deno.test("contact-create: omits fields that were not set", async () => {
  const { ctx, calls } = mockCtx([{ body: recordBody({ id: 1 }) }]);
  await action.execute({ email: "x@y.zz", firstNames: "" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { email: "x@y.zz" });
});

Deno.test("contact-create: a 422 surfaces Simplero's validation errors", async () => {
  const { ctx } = mockCtx([{ status: 422, body: { errors: ["Email is invalid"] } }]);
  await assertRejects(
    async () => await action.execute({ email: "nope" }, ctx),
    Error,
    "Email is invalid",
  );
});
