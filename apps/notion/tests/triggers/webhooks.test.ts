import { describe, test } from "node:test";
import { createHmac } from "node:crypto";
import type { TriggerCall } from "@w6w/types";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import anyEvent from "../../triggers/any-event.ts";
import commentCreated from "../../triggers/comment-created.ts";
import commentDeleted from "../../triggers/comment-deleted.ts";
import commentUpdated from "../../triggers/comment-updated.ts";
import dataSourceContentUpdated from "../../triggers/data-source-content-updated.ts";
import dataSourceCreated from "../../triggers/data-source-created.ts";
import dataSourceDeleted from "../../triggers/data-source-deleted.ts";
import dataSourceSchemaUpdated from "../../triggers/data-source-schema-updated.ts";
import databaseCreated from "../../triggers/database-created.ts";
import databaseDeleted from "../../triggers/database-deleted.ts";
import pageContentUpdated from "../../triggers/page-content-updated.ts";
import pageCreated from "../../triggers/page-created.ts";
import pageDeleted from "../../triggers/page-deleted.ts";
import pageMoved from "../../triggers/page-moved.ts";
import pagePropertiesUpdated from "../../triggers/page-properties-updated.ts";
import pageUndeleted from "../../triggers/page-undeleted.ts";

const SECRET = "test-secret-verification-token";
const PARAMS = { signingSecret: SECRET };

/** Non-canonical whitespace: JSON.stringify(JSON.parse(body)) !== body. */
const eventBody = (type: string) =>
  `{ "id": "367cba44-b6f3-4c92-81e7-6a2e9659efd4",  "timestamp": "2026-11-10T09:00:00.000Z",\n  "workspace_id": "ws-1", "workspace_name": "Acme", "subscription_id": "sub-9", "integration_id": "int-3", "type": "${type}", "authors": [ { "id": "u-1", "type": "person" } ], "attempt_number": 1, "entity": { "id": "ent-1", "type": "page" }, "data": { "parent": { "id": "p-1", "type": "page" } } }`;

const HANDSHAKE = '{ "verification_token":  "test-verification-token" }';

/** Narrow the `E[] | { events, response? }` union (brief §3). */
const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);

/** Expected signature, computed independently of the app: sha256=hex(HMAC-SHA256(secret, body)). */
const sign = (body: string, secret = SECRET) =>
  `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;

function call(
  headers: Record<string, string>,
  rawBody: string | null,
  method = "POST",
): TriggerCall {
  const raw: TriggerCall = { method, path: "/hook", query: {}, headers, body: null };
  if (rawBody !== null) {
    raw.rawBody = rawBody;
    raw.body = JSON.parse(rawBody);
  }
  return raw;
}

// deno-lint-ignore no-explicit-any
async function ingest(trigger: any, raw: TriggerCall, params: unknown = PARAMS) {
  const { ctx } = mockCtx();
  return await trigger.handleIngest!(
    { raw, params, state: undefined, subscriptionId: "sub-1" },
    ctx,
  );
}

const NAMED = [
  [pageCreated, "page.created"],
  [pagePropertiesUpdated, "page.properties_updated"],
  [pageContentUpdated, "page.content_updated"],
  [pageMoved, "page.moved"],
  [pageDeleted, "page.deleted"],
  [pageUndeleted, "page.undeleted"],
  [databaseCreated, "database.created"],
  [databaseDeleted, "database.deleted"],
  [dataSourceCreated, "data_source.created"],
  [dataSourceContentUpdated, "data_source.content_updated"],
  [dataSourceSchemaUpdated, "data_source.schema_updated"],
  [dataSourceDeleted, "data_source.deleted"],
  [commentCreated, "comment.created"],
  [commentUpdated, "comment.updated"],
  [commentDeleted, "comment.deleted"],
] as const;

const EXPECTED = (type: string) => ({
  id: "367cba44-b6f3-4c92-81e7-6a2e9659efd4",
  type,
  timestamp: "2026-11-10T09:00:00.000Z",
  workspaceId: "ws-1",
  workspaceName: "Acme",
  subscriptionId: "sub-9",
  integrationId: "int-3",
  entityId: "ent-1",
  entityType: "page",
  authors: [{ id: "u-1", type: "person" }],
  data: { parent: { id: "p-1", type: "page" } },
  attemptNumber: 1,
  verificationToken: null,
});

describe("notion webhook triggers (named)", () => {
  test("fixture bodies have non-canonical whitespace", () => {
    const body = eventBody("page.created");
    assert(JSON.stringify(JSON.parse(body)) !== body);
  });

  for (const [trigger, type] of NAMED) {
    describe(trigger.key, () => {
      test("declares a signing param, output and sample for its event", () => {
        assertEquals(trigger.sample.type, type);
        assert(trigger.output.length > 0);
        assertEquals(trigger.params?.map((p) => p.key), ["signingSecret"]);
        assertEquals(trigger.params?.[0].type, "secret");
      });

      test("onSubscribe makes no Notion call and returns the callback URL", async () => {
        const m = mockCtx();
        const state = await trigger.onSubscribe!(
          { params: PARAMS, callbackUrl: "https://w6w.example/hook/abc", subscriptionId: "s" },
          m.ctx,
        );
        assertEquals(state, { mode: "manual", callbackUrl: "https://w6w.example/hook/abc" });
        assertEquals(m.calls.length, 0);
      });

      test("a valid signature over the exact raw body yields the normalized event", async () => {
        const body = eventBody(type);
        const out = evs(await ingest(trigger, call({ "x-notion-signature": sign(body) }, body)));
        assertEquals(out, [EXPECTED(type)]);
      });

      test("a signed event of another type yields nothing", async () => {
        const body = eventBody("page.locked");
        const out = evs(await ingest(trigger, call({ "x-notion-signature": sign(body) }, body)));
        assertEquals(out, []);
      });

      test("a one-byte change to the body throws", async () => {
        const body = eventBody(type);
        await assertRejects(
          () =>
            ingest(
              trigger,
              call({ "x-notion-signature": sign(body) }, body.replace("ws-1", "ws-2")),
            ),
          Error,
          "refused",
        );
      });

      test("a flipped signature byte throws without echoing it or the secret", async () => {
        const body = eventBody(type);
        const good = sign(body);
        const bad = good.slice(0, -1) + (good.endsWith("a") ? "b" : "a");
        const err = await assertRejects(() =>
          ingest(trigger, call({ "x-notion-signature": bad }, body))
        );
        assert(err.message.includes("refused"));
        assert(!err.message.includes(bad) && !err.message.includes(SECRET));
      });

      test("a missing signature header throws", async () => {
        await assertRejects(
          () => ingest(trigger, call({}, eventBody(type))),
          Error,
          "header is missing",
        );
      });

      test("a missing rawBody throws (never re-serialises the parsed body)", async () => {
        const raw = call({ "x-notion-signature": sign(eventBody(type)) }, null);
        raw.body = JSON.parse(eventBody(type));
        await assertRejects(() => ingest(trigger, raw), Error, "raw body");
      });

      test("an unset or empty signing secret refuses the delivery before any compare", async () => {
        const body = eventBody(type);
        for (const params of [{}, { signingSecret: "" }, null]) {
          // A signature made with an empty key must never be accepted.
          const err = await assertRejects(() =>
            ingest(trigger, call({ "x-notion-signature": sign(body, "") }, body), params)
          );
          assert(/secret/i.test(err.message), err.message);
        }
      });

      test("a signature over a re-serialised body does not verify", async () => {
        const body = eventBody(type);
        const canonical = JSON.stringify(JSON.parse(body));
        await assertRejects(
          () => ingest(trigger, call({ "x-notion-signature": sign(canonical) }, body)),
          Error,
          "refused",
        );
      });

      test("a signature made with another secret throws", async () => {
        const body = eventBody(type);
        await assertRejects(
          () => ingest(trigger, call({ "x-notion-signature": sign(body, "another") }, body)),
          Error,
          "refused",
        );
      });

      test("a non-POST delivery throws", async () => {
        const body = eventBody(type);
        await assertRejects(
          () => ingest(trigger, call({ "x-notion-signature": sign(body) }, body, "GET")),
          Error,
          "POST",
        );
      });
    });
  }
});

describe("any-event", () => {
  test("declares signingSecret and events params", () => {
    assertEquals(anyEvent.key, "any-event");
    assertEquals(anyEvent.params?.map((p) => p.key), ["signingSecret", "events"]);
  });

  test("empty events passes every signed event type", async () => {
    for (const type of ["page.created", "page.locked", "data_source.undeleted"]) {
      const body = eventBody(type);
      const out = evs(await ingest(anyEvent, call({ "x-notion-signature": sign(body) }, body)));
      assertEquals(out, [EXPECTED(type)]);
    }
  });

  test("a listed events filter keeps only those types (spaces and empties ignored)", async () => {
    const params = { ...PARAMS, events: " page.locked , ,comment.created" };
    const locked = eventBody("page.locked");
    const created = eventBody("page.created");
    assertEquals(
      evs(await ingest(anyEvent, call({ "x-notion-signature": sign(locked) }, locked), params)),
      [EXPECTED("page.locked")],
    );
    assertEquals(
      evs(await ingest(anyEvent, call({ "x-notion-signature": sign(created) }, created), params)),
      [],
    );
  });

  test("the events filter never lets an unsigned delivery through", async () => {
    const body = eventBody("page.locked");
    await assertRejects(
      () => ingest(anyEvent, call({}, body), { ...PARAMS, events: "page.locked" }),
      Error,
      "header is missing",
    );
  });

  test("a signed body without a type throws", async () => {
    const body = '{ "id": "x" }';
    await assertRejects(
      () => ingest(anyEvent, call({ "x-notion-signature": sign(body) }, body)),
      Error,
      "type",
    );
  });

  test("a signed body that is not JSON throws", async () => {
    const body = "not json";
    const raw: TriggerCall = {
      method: "POST",
      path: "/hook",
      query: {},
      headers: { "x-notion-signature": sign(body) },
      body: null,
      rawBody: body,
    };
    await assertRejects(() => ingest(anyEvent, raw), Error, "JSON");
  });
});

describe("setup handshake (unsigned verification_token)", () => {
  test("with the secret still empty, the handshake is delivered as a verification event", async () => {
    for (const trigger of [anyEvent, pageCreated]) {
      for (const params of [{}, { signingSecret: "" }]) {
        const out = evs(await ingest(trigger, call({}, HANDSHAKE), params));
        assertEquals(out.length, 1);
        const event = out[0] as Record<string, unknown>;
        assertEquals(event.type, "verification");
        assertEquals(event.verificationToken, "test-verification-token");
        assertEquals(event.id, null);
      }
    }
  });

  test("once the secret is set, an unsigned handshake is refused", async () => {
    await assertRejects(
      () => ingest(anyEvent, call({}, HANDSHAKE)),
      Error,
      "header is missing",
    );
  });

  test("with the secret empty, a handshake carrying a signature header is refused", async () => {
    const err = await assertRejects(() =>
      ingest(anyEvent, call({ "x-notion-signature": sign(HANDSHAKE, "") }, HANDSHAKE), {})
    );
    assert(/secret/i.test(err.message));
  });

  test("with the secret empty, a body with extra fields is not a handshake", async () => {
    const body = '{ "verification_token": "test-verification-token", "type": "page.created" }';
    const err = await assertRejects(() => ingest(anyEvent, call({}, body), {}));
    assert(/secret/i.test(err.message));
  });

  test("with the secret empty, an empty or non-string token is not a handshake", async () => {
    for (const body of ['{ "verification_token": "" }', '{ "verification_token": 5 }']) {
      const err = await assertRejects(() => ingest(anyEvent, call({}, body), {}));
      assert(/secret/i.test(err.message));
    }
  });

  test("the handshake still needs a raw body", async () => {
    const raw = call({}, null);
    raw.body = JSON.parse(HANDSHAKE);
    await assertRejects(() => ingest(anyEvent, raw, {}), Error, "raw body");
  });
});
