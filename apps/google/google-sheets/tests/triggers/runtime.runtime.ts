/**
 * The row triggers as the host runs them: loaded by `@w6w/runtime`'s loader and polled through
 * `invokeTriggerHook` in the sandbox, with the egress transport standing in for Google. Proves the
 * loader derives `type: "poll"`, the connection's `sign` hook puts the bearer token on the request,
 * the request reaches `sheets.googleapis.com`, and the snapshot hash (`crypto.subtle`) runs inside
 * the worker.
 */
import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { fromFileUrl } from "jsr:@std/path@^1.0.0";
import { invokeTriggerHook, loadApp } from "@w6w/runtime";
import type { Connection } from "@w6w/types";

const APP_DIR = fromFileUrl(new URL("../../", import.meta.url));
const KEYS = ["new-sheet", "row-added", "row-added-or-updated", "row-updated"];

const connection: Connection = {
  manifestVersion: "1",
  id: "conn_sheets_rt",
  app: "io.w6w.google-sheets",
  auth: "oauth2",
  owner: "user_rt",
  state: "connected",
  credential: { accessToken: "tok_sheets_rt" },
  createdAt: new Date().toISOString(),
};

/**
 * `egressTransport` replaces the auth `sign` hook, so it cannot show the bearer token. Instead the
 * host's own egress `fetch` (what `hostFetch` calls after `sign` ran in its sandbox) is stubbed for
 * the duration of a call: the request recorded here is the SIGNED one.
 */
async function withSheets<T>(grids: unknown[][][], fn: () => Promise<T>) {
  const seen: Array<{ url: string; method: string; authorization: string | null }> = [];
  const real = globalThis.fetch;
  globalThis.fetch = ((input: string | URL | Request, init?: RequestInit) => {
    const req = new Request(input, init);
    seen.push({
      url: req.url,
      method: req.method,
      authorization: req.headers.get("authorization"),
    });
    const values = grids.shift() ?? [];
    return Promise.resolve(Response.json({ range: "Leads!A1:B3", values }));
  }) as typeof fetch;
  try {
    return { result: await fn(), seen };
  } finally {
    globalThis.fetch = real;
  }
}

test("runtime: every trigger loads as a poll with only the poll hook", async () => {
  const app = await loadApp(APP_DIR);
  assertEquals([...app.triggers.keys()].sort(), KEYS);
  for (const [key, t] of app.triggers) {
    assertEquals(t.trigger.type, "poll", key);
    assertEquals([...t.hooks], ["poll"], key);
  }
});

test("runtime: a poll seeds, then emits the added row, with a signed request", async () => {
  const app = await loadApp(APP_DIR);
  const head = ["id", "name"];
  const poll = (state: unknown) =>
    invokeTriggerHook(app, {
      triggerKey: "row-added",
      hook: "poll",
      input: { params: { spreadsheetId: "ss-1", sheetName: "Leads" }, state, subscriptionId: "s" },
      connection,
    }) as Promise<{ events: unknown[]; nextState: { seeded: boolean; hashes: object } }>;

  const { result, seen } = await withSheets([
    [head, [1, "Ada"]],
    [head, [1, "Ada"], [2, "Bob"]],
  ], async () => {
    const first = await poll({});
    return { first, second: await poll(first.nextState) };
  });
  const { first, second } = result;
  assertEquals(first.events, []);
  assertEquals(first.nextState.seeded, true);
  assertEquals(Object.keys(first.nextState.hashes), ["2"]);
  assertEquals(second.events, [{ change: "added", rowNumber: 3, values: { id: 2, name: "Bob" } }]);

  assertEquals(seen.length, 2);
  for (const r of seen) {
    const url = new URL(r.url);
    assertEquals(r.method, "GET");
    assertEquals(url.host, "sheets.googleapis.com");
    assertEquals(url.pathname, "/v4/spreadsheets/ss-1/values/Leads");
    assertEquals(r.authorization, "Bearer tok_sheets_rt");
  }
});
