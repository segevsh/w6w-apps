/**
 * D3 proof: `crypto.subtle` works inside the trigger-hook sandbox worker, so the poll kit's
 * snapshot hash is SHA-256 (truncated to 12 hex), not a pure-JS fallback.
 */
import { assertEquals } from "@std/assert";
import { fromFileUrl } from "jsr:@std/path@^1.0.0";
import { invokeTriggerHook, loadApp } from "@w6w/runtime";

const APP_DIR = fromFileUrl(
  new URL("./_fixtures/trigger-subtle/", import.meta.url),
);

Deno.test("sandbox: crypto.subtle SHA-256 of 'abc' matches the known digest", async () => {
  const app = await loadApp(APP_DIR);
  const out = await invokeTriggerHook(app, {
    triggerKey: "subtle",
    hook: "poll",
    input: { params: {}, state: {}, subscriptionId: "sub_1" },
  }) as { events: Array<{ hex: string }> };
  assertEquals(
    out.events[0].hex,
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
});
