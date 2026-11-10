import assert from "node:assert/strict";
import test from "node:test";
import anyEvent from "../../triggers/any-event.ts";
import fieldCreated from "../../triggers/field-created.ts";
import fieldDeleted from "../../triggers/field-deleted.ts";
import fieldUpdated from "../../triggers/field-updated.ts";
import fieldValueCreated from "../../triggers/field-value-created.ts";
import fieldValueDeleted from "../../triggers/field-value-deleted.ts";
import fieldValueUpdated from "../../triggers/field-value-updated.ts";
import listCreated from "../../triggers/list-created.ts";
import listDeleted from "../../triggers/list-deleted.ts";
import listEntryDeleted from "../../triggers/list-entry-deleted.ts";
import listUpdated from "../../triggers/list-updated.ts";
import noteCreated from "../../triggers/note-created.ts";
import noteDeleted from "../../triggers/note-deleted.ts";
import noteUpdated from "../../triggers/note-updated.ts";
import opportunityCreated from "../../triggers/opportunity-created.ts";
import opportunityDeleted from "../../triggers/opportunity-deleted.ts";
import opportunityUpdated from "../../triggers/opportunity-updated.ts";
import organizationCreated from "../../triggers/organization-created.ts";
import organizationDeleted from "../../triggers/organization-deleted.ts";
import organizationUpdated from "../../triggers/organization-updated.ts";
import personCreated from "../../triggers/person-created.ts";
import personDeleted from "../../triggers/person-deleted.ts";
import personUpdated from "../../triggers/person-updated.ts";
import { mockCtx } from "../_helpers.ts";

const CALLBACK = "https://w6w.example/triggers/webhooks/sub_123";
const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);

// Affinity "Supported Webhook Events" (api-docs.affinity.co, read 2026-11-10).
const NAMED = [
  [listCreated, "list-created", "list.created"],
  [listUpdated, "list-updated", "list.updated"],
  [listDeleted, "list-deleted", "list.deleted"],
  [listEntryDeleted, "list-entry-deleted", "list_entry.deleted"],
  [noteCreated, "note-created", "note.created"],
  [noteUpdated, "note-updated", "note.updated"],
  [noteDeleted, "note-deleted", "note.deleted"],
  [fieldCreated, "field-created", "field.created"],
  [fieldUpdated, "field-updated", "field.updated"],
  [fieldDeleted, "field-deleted", "field.deleted"],
  [fieldValueCreated, "field-value-created", "field_value.created"],
  [fieldValueUpdated, "field-value-updated", "field_value.updated"],
  [fieldValueDeleted, "field-value-deleted", "field_value.deleted"],
  [personCreated, "person-created", "person.created"],
  [personUpdated, "person-updated", "person.updated"],
  [personDeleted, "person-deleted", "person.deleted"],
  [organizationCreated, "organization-created", "organization.created"],
  [organizationUpdated, "organization-updated", "organization.updated"],
  [organizationDeleted, "organization-deleted", "organization.deleted"],
  [opportunityCreated, "opportunity-created", "opportunity.created"],
  [opportunityUpdated, "opportunity-updated", "opportunity.updated"],
  [opportunityDeleted, "opportunity-deleted", "opportunity.deleted"],
] as const;

for (const [trigger, key, event] of NAMED) {
  test(`${key}: registers only ${event} and replaces its own stale registration`, async () => {
    assert.equal(trigger.key, key);
    const { ctx, calls } = mockCtx([
      {
        body: [{ id: 7, webhook_url: CALLBACK }, { id: 8, webhook_url: "https://other.example/x" }],
      },
      { body: { success: true } },
      { body: { id: 9 } },
    ]);
    assert.deepEqual(await trigger.onSubscribe!({ params: {}, callbackUrl: CALLBACK }, ctx), {
      webhookId: "9",
    });
    assert.deepEqual(calls.map(({ method, url, body }) => ({ method, url, body })), [
      { method: "GET", url: "https://api.affinity.co/webhook", body: null },
      { method: "DELETE", url: "https://api.affinity.co/webhook/7", body: null },
      {
        method: "POST",
        url: "https://api.affinity.co/webhook/subscribe",
        body: JSON.stringify({ webhook_url: CALLBACK, subscriptions: [event] }),
      },
    ]);
  });

  test(`${key}: unsubscribe deletes the stored webhook; an already-gone one is fine`, async () => {
    const ok = mockCtx([{ body: { success: true } }]);
    await trigger.onUnsubscribe!({ params: {}, state: { webhookId: "9" } }, ok.ctx);
    assert.deepEqual(ok.calls.map(({ method, url }) => ({ method, url })), [
      { method: "DELETE", url: "https://api.affinity.co/webhook/9" },
    ]);
    const gone = mockCtx([{ status: 404, statusText: "Not Found", body: "Unknown API endpoint" }]);
    await trigger.onUnsubscribe!({ params: {}, state: { webhookId: "9" } }, gone.ctx);
  });

  test(`${key}: delivers ${event} only, refuses non-POST`, async () => {
    const body = { type: event, body: { id: 3 }, sent_at: 1631120151 };
    assert.deepEqual(
      evs(
        await trigger.handleIngest!({ raw: { method: "POST", body } } as never, undefined as never),
      ),
      [body],
    );
    const stray = { type: "zzz.created", body: { id: 3 }, sent_at: 1631120151 };
    assert.deepEqual(
      evs(
        await trigger.handleIngest!(
          { raw: { method: "POST", body: stray } } as never,
          undefined as never,
        ),
      ),
      [],
    );
    await assert.rejects(
      async () =>
        await trigger.handleIngest!({ raw: { method: "GET" } } as never, undefined as never),
      /POST/,
    );
  });
}

test("every named trigger declares a non-empty output and a sample of the delivered shape", () => {
  for (const [trigger, , event] of NAMED) {
    assert.ok(trigger.output!.length > 0);
    assert.equal((trigger.sample as { type: string }).type, event);
  }
});

test("any-event: no events param subscribes to every event (empty array)", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }, { body: { id: 11 } }]);
  assert.deepEqual(await anyEvent.onSubscribe!({ params: {}, callbackUrl: CALLBACK }, ctx), {
    webhookId: "11",
  });
  assert.deepEqual(calls.map(({ method, url, body }) => ({ method, url, body })), [
    { method: "GET", url: "https://api.affinity.co/webhook", body: null },
    {
      method: "POST",
      url: "https://api.affinity.co/webhook/subscribe",
      body: JSON.stringify({ webhook_url: CALLBACK, subscriptions: [] }),
    },
  ]);
});

test("any-event: the events param becomes the registered subscription list", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }, { body: { id: 12 } }]);
  await anyEvent.onSubscribe!({
    params: { events: " person.created, file.created ,person.created" },
    callbackUrl: CALLBACK,
  }, ctx);
  assert.equal(
    calls[1].body,
    JSON.stringify({ webhook_url: CALLBACK, subscriptions: ["person.created", "file.created"] }),
  );
});

test("any-event: an unknown event name is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assert.rejects(
    async () =>
      await anyEvent.onSubscribe!({
        params: { events: "person.created,person.exploded" },
        callbackUrl: CALLBACK,
      }, ctx),
    /person\.exploded/,
  );
  assert.equal(calls.length, 0);
});

test("any-event: the filter drops events outside the list; empty list delivers all", async () => {
  const file = { type: "file.created", body: { id: 1 }, sent_at: 1631120151 };
  const person = { type: "person.created", body: { id: 2 }, sent_at: 1631120151 };
  const call = (body: unknown) => ({ method: "POST", body });
  const run = async (events: string | undefined, body: unknown) =>
    evs(
      await anyEvent.handleIngest!(
        { raw: call(body), params: { events } } as never,
        undefined as never,
      ),
    );
  assert.deepEqual(await run("file.created", file), [file]);
  assert.deepEqual(await run("file.created", person), []);
  assert.deepEqual(await run(undefined, person), [person]);
  assert.deepEqual(await run("", file), [file]);
  await assert.rejects(
    async () =>
      await anyEvent.handleIngest!(
        { raw: { method: "PUT", body: file }, params: {} } as never,
        undefined as never,
      ),
    /POST/,
  );
});

test("any-event: unsubscribe deletes the stored webhook", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  await anyEvent.onUnsubscribe!({ params: {}, state: { webhookId: "12" } }, ctx);
  assert.deepEqual(calls.map(({ method, url }) => ({ method, url })), [
    { method: "DELETE", url: "https://api.affinity.co/webhook/12" },
  ]);
});
