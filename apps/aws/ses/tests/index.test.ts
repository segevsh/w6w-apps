import { assertEquals } from "@std/assert";
import app from "../index.ts";

const EXPECTED = [
  "account-get",
  "configuration-set-list",
  "contact-create",
  "contact-delete",
  "contact-get",
  "contact-list-list",
  "contact-search",
  "identity-create",
  "identity-delete",
  "identity-get",
  "identity-list",
  "send-bulk-email",
  "send-email",
  "send-templated-email",
  "suppression-delete",
  "suppression-get",
  "suppression-list",
  "suppression-put",
  "template-create",
  "template-delete",
  "template-get",
  "template-list",
  "template-update",
];

Deno.test("index: declares exactly one auth method, `aws-iam`", () => {
  assertEquals(app.auth?.length, 1);
  assertEquals(app.auth?.[0].key, "aws-iam");
});

Deno.test("index: declares the 23 actions with unique kebab-case keys", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "action keys must be unique");
  for (const key of keys) {
    if (!/^[a-z]+(-[a-z]+)*$/.test(key)) throw new Error(`not kebab-case: ${key}`);
  }
  assertEquals([...keys].sort(), EXPECTED);
});

Deno.test("index: every action has execute and output; every perform declares idempotent honestly", () => {
  for (const action of app.actions) {
    if (typeof action.execute !== "function") throw new Error(`${action.key}: missing execute`);
    if (!Array.isArray(action.output)) throw new Error(`${action.key}: missing output`);
  }
  const perform = Object.fromEntries(
    app.actions.filter((a) => a.type === "perform").map((a) => [a.key, a.idempotent]),
  );
  // Sends and creates are NOT retry-safe (SES takes no client token; a second create is a 400).
  for (
    const k of [
      "send-email",
      "send-templated-email",
      "send-bulk-email",
      "identity-create",
      "template-create",
      "contact-create",
    ]
  ) {
    assertEquals(perform[k], false, k);
  }
  // PUT-by-name and DELETE-by-name converge on the same state.
  for (
    const k of [
      "identity-delete",
      "template-update",
      "template-delete",
      "suppression-put",
      "suppression-delete",
      "contact-delete",
    ]
  ) {
    assertEquals(perform[k], true, k);
  }
});

Deno.test("index: declares the `service` and `quota` health checks", () => {
  assertEquals(app.healthChecks?.map((h) => h.key), ["service", "quota"]);
});
