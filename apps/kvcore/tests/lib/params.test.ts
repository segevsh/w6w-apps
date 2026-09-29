import { assertEquals } from "@std/assert";
import { contactBody, entityBody, userBody } from "../../lib/params.ts";

Deno.test("contactBody: joins deal_type into a comma string and drops empties", () => {
  assertEquals(
    contactBody({ first_name: "A", deal_type: ["buyer", "seller"], middle_name: "" }),
    { first_name: "A", deal_type: "buyer,seller" },
  );
});

Deno.test("contactBody: booleans become 1/0, not true/false", () => {
  assertEquals(
    contactBody({ email_optin: true, phone_on: false, text_on: true }),
    { email_optin: 1, phone_on: 0, text_on: 1 },
  );
});

Deno.test("contactBody: status is coerced to a number", () => {
  assertEquals(contactBody({ status: "7" }), { status: 7 });
});

Deno.test("entityBody: status/visibility booleans become 1/0", () => {
  assertEquals(entityBody({ name: "HQ", status: true, visibility: false }), {
    name: "HQ",
    status: 1,
    visibility: 0,
  });
});

Deno.test("userBody: every documented boolean field becomes 1/0", () => {
  assertEquals(
    userBody({
      status: true,
      company_admin: false,
      show_cell_phone: true,
      show_work_phone: false,
      show_direct_phone: true,
      visibility: false,
    }),
    {
      status: 1,
      company_admin: 0,
      show_cell_phone: 1,
      show_work_phone: 0,
      show_direct_phone: 1,
      visibility: 0,
    },
  );
});
