import { assertEquals, assertThrows } from "@std/assert";
import {
  customFields,
  describeErrors,
  endpoint,
  isAuthError,
  jsonValue,
  resolveEnvironment,
  strList,
} from "../../lib/client.ts";

Deno.test("endpoint: one POST url per environment", () => {
  assertEquals(endpoint("production"), "https://payments.braintree-api.com/graphql");
  assertEquals(endpoint("sandbox"), "https://payments.sandbox.braintree-api.com/graphql");
});

Deno.test("resolveEnvironment: reads the published display, defaults to production", () => {
  assertEquals(resolveEnvironment(undefined), "production");
  assertEquals(resolveEnvironment({ display: { environment: "sandbox" } } as never), "sandbox");
  assertEquals(resolveEnvironment({ display: { environment: "nope" } } as never), "production");
});

Deno.test("describeErrors: joins class, legacy code, message and input path", () => {
  assertEquals(
    describeErrors([
      {
        message: "a",
        extensions: { errorClass: "VALIDATION", legacyCode: "1", inputPath: ["input", "x"] },
      },
      { message: "b" },
    ]),
    "[VALIDATION 1] a (input.x); b",
  );
});

Deno.test("isAuthError: only the AUTHENTICATION class counts", () => {
  assertEquals(isAuthError({ errors: [{ extensions: { errorClass: "AUTHENTICATION" } }] }), true);
  assertEquals(isAuthError({ errors: [{ extensions: { errorClass: "VALIDATION" } }] }), false);
  assertEquals(isAuthError(null), false);
});

Deno.test("customFields: object, array and JSON text all become [{name, value}]", () => {
  assertEquals(customFields({ a: 1 }), [{ name: "a", value: "1" }]);
  assertEquals(customFields([{ name: "a", value: "b" }]), [{ name: "a", value: "b" }]);
  assertEquals(customFields('{"a":"b"}'), [{ name: "a", value: "b" }]);
  assertEquals(customFields(undefined), undefined);
  assertThrows(() => customFields(5), Error, "customFields must be");
});

Deno.test("jsonValue and strList: tolerate form-field text", () => {
  assertEquals(jsonValue(" "), undefined);
  assertEquals(jsonValue("{bad"), "{bad");
  assertEquals(strList("a, b,,c"), ["a", "b", "c"]);
  assertEquals(strList(""), undefined);
});
