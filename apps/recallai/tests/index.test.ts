import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exports 29 uniquely-keyed kebab-case actions", () => {
  assertEquals(app.actions.length, 29);
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const k of keys) assert(/^[a-z]+(-[a-z]+)+$/.test(k), k);
});

Deno.test("index: every action is complete; creating and messaging actions are not idempotent", () => {
  for (const a of app.actions) {
    assert(a.type, `${a.key} type`);
    assert(a.description, `${a.key} description`);
    assert(a.output, `${a.key} output`);
    assert(a.resource, `${a.key} resource`);
    assertEquals(typeof a.execute, "function");
  }
  for (
    const k of [
      "bot-create",
      "bot-send-chat-message",
      "bot-output-audio",
      "bot-start-recording",
      "recording-create-transcript",
    ]
  ) {
    assertEquals(app.actions.find((a) => a.key === k)!.idempotent, false, k);
  }
});

Deno.test("index: one apiKey auth and the three health checks", () => {
  assertEquals(app.auth.map((a) => a.key), ["api-key"]);
  assertEquals(app.auth[0].type, "apiKey");
  assertEquals((app.healthChecks ?? []).map((h) => h.key), ["service", "api", "quota"]);
});
