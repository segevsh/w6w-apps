/**
 * The `new-email` poll trigger as the host runs it: loaded by `@w6w/runtime`'s loader and invoked
 * through `invokeTriggerHook` in the sandbox with an OAuth connection and a fake egress transport
 * standing in for Gmail. Proves the loader derives `type: "poll"`, the request passes the app's
 * network allowlist, and the auth `sign` hook runs in the trigger path.
 */
import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { fromFileUrl } from "jsr:@std/path@^1.0.0";
import { type Connection, invokeTriggerHook, loadApp } from "@w6w/runtime";

const APP_DIR = fromFileUrl(new URL("../../", import.meta.url));
const TOKEN = "ya29.test-access-token";

const CONN = {
  manifestVersion: "1",
  id: "conn_gmail_rt",
  app: "io.w6w.gmail",
  auth: "oauth2",
  owner: "user_1",
  state: "connected",
  credential: { accessToken: TOKEN },
  createdAt: "2026-11-09T00:00:00Z",
} as unknown as Connection;

/**
 * `egressTransport` replaces the auth `sign` hook AND host egress as one unit (core runtime.ts
 * signingFetch), so it cannot show the token being injected. Instead the host's own `fetch` is
 * stubbed for the test: the real `sign` hook runs in the trigger path and the signed request lands
 * here, never on the network.
 */
async function withGmail<T>(responses: unknown[], run: () => Promise<T>) {
  const seen: Array<{ url: string; headers: Headers }> = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const req = new Request(input, init);
    seen.push({ url: req.url, headers: req.headers });
    return Promise.resolve(
      new Response(JSON.stringify(responses.shift() ?? {}), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
  }) as typeof fetch;
  try {
    return { value: await run(), seen };
  } finally {
    globalThis.fetch = realFetch;
  }
}

test("runtime: new-email loads as a poll trigger with only the poll hook", async () => {
  const app = await loadApp(APP_DIR);
  const t = app.triggers.get("new-email")!;
  assertEquals(t.trigger.type, "poll");
  assertEquals([...t.hooks], ["poll"]);
});

test("runtime: a poll check reaches Gmail signed with the connection's access token", async () => {
  const app = await loadApp(APP_DIR);
  const { value, seen } = await withGmail(
    [{ messages: [{ id: "m1", threadId: "t1" }] }],
    () =>
      invokeTriggerHook(app, {
        triggerKey: "new-email",
        hook: "poll",
        input: { params: {}, state: {}, subscriptionId: "sub_rt" },
        connection: CONN,
      }),
  );
  const o = value as { events: unknown[]; nextState: { seeded: boolean; ids: string[] } };
  assertEquals(o.events, []);
  assertEquals(o.nextState.seeded, true);
  assertEquals(o.nextState.ids, ["m1"]);
  assertEquals(seen.length, 1);
  const url = new URL(seen[0].url);
  assertEquals(url.host, "gmail.googleapis.com");
  assertEquals(url.pathname, "/gmail/v1/users/me/messages");
  assertEquals(seen[0].headers.get("authorization"), `Bearer ${TOKEN}`);
});
