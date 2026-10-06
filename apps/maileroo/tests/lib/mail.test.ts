import { assertEquals, assertThrows } from "@std/assert";
import { asObject, commonBody, parseRecipients } from "../../lib/mail.ts";

Deno.test("parseRecipients: strings, display names, arrays and objects", () => {
  assertEquals(parseRecipients('a@x.com, Jane Smith <j@x.com>;\n"Bob" <b@x.com>', "to"), [
    { address: "a@x.com" },
    { address: "j@x.com", display_name: "Jane Smith" },
    { address: "b@x.com", display_name: "Bob" },
  ]);
  assertEquals(parseRecipients(["a@x.com"], "to"), [{ address: "a@x.com" }]);
  assertEquals(parseRecipients({ address: "a@x.com", display_name: "A" }, "to"), [
    { address: "a@x.com", display_name: "A" },
  ]);
  assertEquals(parseRecipients(undefined, "cc"), []);
  assertThrows(() => parseRecipients([{ display_name: "x" }], "to"), Error, "no address");
});

Deno.test("asObject: accepts objects and JSON strings, rejects arrays", () => {
  assertEquals(asObject('{"a":1}', "tags"), { a: 1 });
  assertEquals(asObject("", "tags"), undefined);
  assertThrows(() => asObject("[1]", "tags"), Error, "JSON object");
});

Deno.test("commonBody: shapes the vendor body and validates limits", () => {
  const body = commonBody({
    fromAddress: "me@d.com",
    fromName: "Me",
    to: "a@x.com",
    bcc: "b@x.com",
    subject: "Hi",
    tracking: false,
    referenceId: "5f2b4c9d8a7e4f3b2c1d9e8f",
  });
  assertEquals(body, {
    from: { address: "me@d.com", display_name: "Me" },
    to: [{ address: "a@x.com" }],
    bcc: [{ address: "b@x.com" }],
    subject: "Hi",
    tracking: false,
    reference_id: "5f2b4c9d8a7e4f3b2c1d9e8f",
  });
  assertThrows(
    () => commonBody({ fromAddress: "m@d.com", to: "a@x.com", subject: "x".repeat(256) }),
    Error,
    "255",
  );
  assertThrows(
    () => commonBody({ fromAddress: "m@d.com", to: "a@x.com", subject: "s", referenceId: "nope" }),
    Error,
    "24-character",
  );
  assertThrows(
    () => commonBody({ fromAddress: "m@d.com", to: "", subject: "s" }),
    Error,
    "to is required",
  );
});
