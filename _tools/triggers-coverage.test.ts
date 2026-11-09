import { assertEquals } from "@std/assert";
import { countTriggers, formatLine, summarize } from "./triggers-coverage.ts";

Deno.test("countTriggers: 2 webhook + 1 poll", () => {
  const def = {
    triggers: [
      { key: "a", onSubscribe() {}, onUnsubscribe() {} },
      { key: "b" },
      { key: "c", poll() {} },
    ],
  };
  assertEquals(countTriggers(def), { webhook: 2, poll: 1 });
});

Deno.test("countTriggers: no triggers key", () => {
  assertEquals(countTriggers({ actions: [] }), { webhook: 0, poll: 0 });
  assertEquals(countTriggers(undefined), { webhook: 0, poll: 0 });
});

Deno.test("summarize: webhook-only, poll-only, both", () => {
  assertEquals(
    summarize({
      a: { webhook: 3, poll: 0 },
      b: { webhook: 0, poll: 1 },
      c: { webhook: 1, poll: 2 },
      d: { webhook: 0, poll: 0 },
    }),
    { apps: 3, webhookApps: 2, pollApps: 2, bothApps: 1 },
  );
});

Deno.test("formatLine: exact text", () => {
  assertEquals(
    formatLine({ apps: 3, webhookApps: 2, pollApps: 2, bothApps: 1 }),
    "Triggers: 3 apps (2 webhook, 2 poll)",
  );
});
