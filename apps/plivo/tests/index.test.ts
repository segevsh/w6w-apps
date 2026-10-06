import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const EXPECTED = [
  "send-message",
  "get-message",
  "list-messages",
  "list-message-media",
  "make-call",
  "get-call",
  "list-calls",
  "list-live-calls",
  "hangup-call",
  "cancel-call-request",
  "list-recordings",
  "get-recording",
  "search-phone-numbers",
  "buy-phone-number",
  "list-numbers",
  "get-number",
  "update-number",
  "get-account",
  "list-applications",
  "get-application",
  "create-application",
];

Deno.test("index: exports exactly the documented actions, keys unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(keys, EXPECTED);
  assertEquals(new Set(keys).size, keys.length);
  for (const k of keys) assert(/^[a-z][a-z0-9-]*$/.test(k), k);
});

Deno.test("index: one basic auth method and the service + quota checks", () => {
  assertEquals(app.auth.map((a) => [a.key, a.type]), [["basic", "basic"]]);
  assertEquals(app.healthChecks.map((h) => h.key), ["service", "quota"]);
});

Deno.test("index: every action has a title and every perform action states idempotency", () => {
  for (const a of app.actions) {
    assert(a.title.length > 0, a.key);
    if (a.type === "perform") assert(typeof a.idempotent === "boolean", a.key);
  }
});

Deno.test("index: no action source holds a credential or the global fetch", async () => {
  for (const k of EXPECTED) {
    const src = await Deno.readTextFile(new URL(`../actions/${k}.ts`, import.meta.url));
    assert(!/authorization/i.test(src), `${k}: Authorization in an action`);
    assert(!/(^|[^.\w])fetch\(/.test(src), `${k}: global fetch`);
  }
});
