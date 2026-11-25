/**
 * The triggers as the host runs them: loaded by `@w6w/runtime`'s loader (which enforces the
 * webhook form) and invoked through `invokeTriggerHook` in the sandbox, with the egress transport
 * standing in for Eventbrite. Proves the hooks survive the worker boundary, their requests pass
 * the app's network allowlist, and the loader derives `type: "webhook"`.
 */
import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { fromFileUrl } from "jsr:@std/path@^1.0.0";
import {
  invokeTriggerHook,
  invokeTriggerResolveFields,
  loadApp,
  type SignableRequest,
  type WireResponse,
} from "@w6w/runtime";
import { WEBHOOK_ACTIONS } from "../../lib/triggers.ts";

const APP_DIR = fromFileUrl(new URL("../../", import.meta.url));
const CALLBACK = "https://api.example.test/triggers/webhooks/sub_rt";

function eventbrite(responses: unknown[]) {
  const seen: SignableRequest[] = [];
  const transport = (request: SignableRequest): Promise<WireResponse> => {
    seen.push(request);
    const next = responses.shift() ?? {};
    return Promise.resolve({
      status: 200,
      statusText: "OK",
      headers: { "content-type": "application/json" },
      body: new TextEncoder().encode(JSON.stringify(next)),
    });
  };
  return { transport, seen };
}

function bodyOf(r: SignableRequest): unknown {
  const b = r.body as unknown;
  if (b === undefined || b === null) return undefined;
  return JSON.parse(typeof b === "string" ? b : new TextDecoder().decode(b as Uint8Array));
}

test("runtime: every trigger loads as a webhook with the full hook set, or as a poll", async () => {
  const app = await loadApp(APP_DIR);
  const all = [...app.triggers];
  const webhooks = all.filter(([, t]) => t.trigger.type === "webhook");
  const polls = all.filter(([, t]) => t.trigger.type === "poll");
  assertEquals(webhooks.length, WEBHOOK_ACTIONS.length + 1);
  assertEquals(polls.length, 11);
  assertEquals(all.length, webhooks.length + polls.length);
  for (const [key, t] of webhooks) {
    assertEquals(
      [...t.hooks].sort(),
      ["handleIngest", "onSubscribe", "onUnsubscribe", "parseOutput", "resolveFields"],
      key,
    );
  }
  for (const [key, t] of polls) assertEquals([...t.hooks].sort(), ["poll", "resolveFields"], key);
});

test("runtime: a trigger's organization and event pickers resolve through the sandbox", async () => {
  const app = await loadApp(APP_DIR);
  const { transport, seen } = eventbrite([
    {
      organizations: [{ id: "389957889113", name: "Acme" }],
      pagination: { has_more_items: false },
    },
    {
      events: [{ id: "e1", name: { text: "Gala" }, start: { local: "2026-12-01T19:00:00" } }],
      pagination: { has_more_items: false },
    },
  ]);
  const out = await invokeTriggerResolveFields(
    app,
    "activity",
    {
      fields: ["organizationId", "eventId"],
      form: { organizationId: "389957889113" },
      unresolved: [],
      reason: "init",
    },
    {
      egressTransport: transport,
      connection: {
        manifestVersion: "1",
        id: "conn_rt",
        app: "eventbrite",
        owner: "user_1",
        state: "connected",
        createdAt: "2026-11-25T00:00:00Z",
        auth: "personal-token",
      },
    },
  );
  assertEquals(out.fields.organizationId?.options, [{ value: "389957889113", label: "Acme" }]);
  assertEquals(out.fields.eventId?.options, [{ value: "e1", label: "Gala · 2026-12-01" }]);
  assertEquals(seen.map((r) => new URL(r.url).pathname), [
    "/v3/users/me/organizations/",
    "/v3/organizations/389957889113/events/",
  ]);
});

test("runtime: register, receive, enrich and destroy through the sandbox", async () => {
  const app = await loadApp(APP_DIR);
  const { transport, seen } = eventbrite([
    { webhooks: [], pagination: { has_more_items: false } },
    { id: "2006536" },
  ]);

  const state = await invokeTriggerHook(app, {
    triggerKey: "order-placed",
    hook: "onSubscribe",
    input: {
      params: { organizationId: "389957889113" },
      subscriptionId: "sub_rt",
      callbackUrl: CALLBACK,
      hostUrl: "https://api.example.test",
    },
    egressTransport: transport,
  });
  assertEquals(state, {
    webhookId: "2006536",
    organizationId: "389957889113",
    actions: ["order.placed"],
    eventId: null,
  });
  assertEquals(seen.map((r) => [r.method, new URL(r.url).pathname]), [
    ["GET", "/v3/organizations/389957889113/webhooks/"],
    ["POST", "/v3/organizations/389957889113/webhooks/"],
  ]);
  assertEquals(bodyOf(seen[1]), { endpoint_url: CALLBACK, actions: "order.placed" });

  const events = await invokeTriggerHook(app, {
    triggerKey: "order-placed",
    hook: "handleIngest",
    input: {
      raw: {
        method: "POST",
        path: "/triggers/webhooks/sub_rt",
        query: {},
        headers: { "content-type": "application/json" },
        body: {
          config: { action: "order.placed", webhook_id: "2006536", user_id: "1" },
          api_url: "https://www.eventbriteapi.com/v3/orders/42/",
        },
      },
      params: {},
      state,
      subscriptionId: "sub_rt",
    },
  }) as unknown[];
  assertEquals(events.length, 1);

  const enrich = eventbrite([{ id: "42", email: "alex@example.com" }]);
  const out = await invokeTriggerHook(app, {
    triggerKey: "order-placed",
    hook: "parseOutput",
    input: { call: null, normalized: events[0], subscriptionId: "sub_rt" },
    egressTransport: enrich.transport,
  }) as { resource: unknown; resourceId: string };
  assertEquals(enrich.seen[0].url, "https://www.eventbriteapi.com/v3/orders/42/");
  assertEquals(out.resource, { id: "42", email: "alex@example.com" });
  assertEquals(out.resourceId, "42");

  const destroy = eventbrite([{}]);
  await invokeTriggerHook(app, {
    triggerKey: "order-placed",
    hook: "onUnsubscribe",
    input: { params: {}, state, subscriptionId: "sub_rt" },
    egressTransport: destroy.transport,
  });
  assertEquals(destroy.seen.map((r) => [r.method, new URL(r.url).pathname]), [
    ["DELETE", "/v3/webhooks/2006536/"],
  ]);
});
