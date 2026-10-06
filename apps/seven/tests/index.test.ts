import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 31;

Deno.test("index: exports actions, one auth method and three health checks", () => {
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth.length, 1);
  assertEquals(app.auth[0].key, "api-key");
  assertEquals(app.healthChecks.map((h) => h.key), ["service", "api", "quota"]);
});

Deno.test("index: every action key is unique and kebab-case, with a description and execute", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const a of app.actions) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.key), `not kebab-case: ${a.key}`);
    assert(["read", "search", "perform"].includes(a.type), `${a.key}: bad type`);
    assert(a.description && a.description.length > 0, `${a.key}: no description`);
    assertEquals(typeof a.execute, "function");
    assert(Array.isArray(a.output), `${a.key}: no output`);
  }
});

Deno.test("index: every perform action states idempotency; reads do not", () => {
  for (const a of app.actions) {
    if (a.type === "perform") {
      assertEquals(typeof a.idempotent, "boolean", `${a.key}: idempotent unset`);
    } else {
      assertEquals(a.idempotent, undefined, `${a.key}: read with idempotent`);
    }
  }
});

Deno.test("index: the two sends are the only non-idempotent calls that spend credit", () => {
  const nonIdem = app.actions.filter((a) => a.type === "perform" && !a.idempotent).map((a) =>
    a.key
  );
  assertEquals(
    nonIdem.sort(),
    ["contact-create", "group-create", "sms-send", "voice-call", "webhook-create"],
  );
});

Deno.test("index: service is a feed check; api is unsigned; quota is signed and informational", () => {
  const by = (k: string) => app.healthChecks.find((h) => h.key === k)!;
  assertEquals(by("service").feed?.url, "https://status.seven.io/history.atom");
  assertEquals(by("api").credential, "none");
  assertEquals(by("quota").credential, "signed");
  assertEquals(by("quota").severity, "informational");
});
