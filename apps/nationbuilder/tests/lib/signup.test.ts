import { assertEquals } from "@std/assert";
import { signupAttributes } from "../../lib/signup.ts";

Deno.test("signupAttributes: maps camelCase params to NationBuilder's snake_case names", () => {
  assertEquals(
    signupAttributes({
      firstName: "Kim",
      lastName: "Possible",
      email: "kim@example.com",
      mobileNumber: "555-1234",
      doNotContact: true,
    }),
    {
      first_name: "Kim",
      last_name: "Possible",
      email: "kim@example.com",
      mobile_number: "555-1234",
      phone_number: undefined,
      employer: undefined,
      note: undefined,
      external_id: undefined,
      email_opt_in: undefined,
      do_not_contact: true,
      do_not_call: undefined,
      custom_values: undefined,
    },
  );
});

Deno.test("signupAttributes: merges the free-form attributes JSON last", () => {
  const out = signupAttributes({ firstName: "Kim", attributes: { church: "St. Mark's" } });
  assertEquals(out.first_name, "Kim");
  assertEquals(out.church, "St. Mark's");
});

Deno.test("signupAttributes: parses customValues into custom_values", () => {
  const out = signupAttributes({ customValues: '{"volunteer_shirt_size":"L"}' });
  assertEquals(out.custom_values, { volunteer_shirt_size: "L" });
});
