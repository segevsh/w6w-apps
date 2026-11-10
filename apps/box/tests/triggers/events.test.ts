import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import type { TriggerCall, TriggerDefinition } from "@w6w/types";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";

const CALLBACK = "https://api.example.test/triggers/webhooks/sub_1";
const KEY = "test-primary-signature-key";
const PARAMS = { primaryKey: KEY };
const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);

// [trigger key, Box webhook trigger, item type] — literals, not read back from the code under test.
const NAMED: Array<[string, string, string]> = [
  ["file-trashed", "FILE.TRASHED", "file"],
  ["file-deleted", "FILE.DELETED", "file"],
  ["file-restored", "FILE.RESTORED", "file"],
  ["file-moved", "FILE.MOVED", "file"],
  ["file-copied", "FILE.COPIED", "file"],
  ["file-renamed", "FILE.RENAMED", "file"],
  ["folder-created", "FOLDER.CREATED", "folder"],
  ["folder-renamed", "FOLDER.RENAMED", "folder"],
  ["folder-moved", "FOLDER.MOVED", "folder"],
  ["folder-copied", "FOLDER.COPIED", "folder"],
  ["folder-trashed", "FOLDER.TRASHED", "folder"],
  ["folder-deleted", "FOLDER.DELETED", "folder"],
  ["folder-restored", "FOLDER.RESTORED", "folder"],
  ["shared-link-created", "SHARED_LINK.CREATED", "file"],
  ["shared-link-updated", "SHARED_LINK.UPDATED", "file"],
  ["shared-link-deleted", "SHARED_LINK.DELETED", "file"],
];

const bodyFor = (trigger: string, type: string) =>
  `{ "type": "webhook_event",  "id": "EV9", "created_at": "2026-11-10T12:00:00-08:00",
  "trigger": "${trigger}", "webhook": { "id": "WH9", "type": "webhook" },
  "created_by": { "id": "11446498", "type": "user", "name": "Alex", "login": "alex@example.com" },
  "source": { "id": "555", "type": "${type}", "name": "thing" } }`;

const sign = (body: string, ts: string, key: string) =>
  createHmac("sha256", key).update(body).update(ts).digest("base64");
const stamp = (offsetSec = 0) => new Date(Date.now() + offsetSec * 1000).toISOString();

/** Same length, one character different: a flipped byte of the signature itself. */
function flip(sig: string): string {
  return (sig[0] === "A" ? "B" : "A") + sig.slice(1);
}

function call(body: string | undefined, headers: Record<string, string>): TriggerCall {
  return {
    method: "POST",
    path: "/triggers/webhooks/sub_1",
    query: {},
    headers,
    body: body === undefined ? null : JSON.parse(body),
    ...(body === undefined ? {} : { rawBody: body }),
  };
}

function ingest(
  t: TriggerDefinition,
  raw: TriggerCall,
  params: Record<string, unknown>,
  triggerName: string,
) {
  const state = { webhookId: "WH9", targetType: "folder", targetId: "0", triggers: [triggerName] };
  return Promise.resolve().then(() =>
    (t as TriggerDefinition<Record<string, unknown>, unknown, unknown>).handleIngest!(
      { raw, params, state, subscriptionId: "sub_1" },
      mockCtx().ctx,
    )
  );
}

describe("box named webhook triggers", () => {
  test("fixture: the body is not canonical JSON", () => {
    const b = bodyFor("FILE.TRASHED", "file");
    assert.notEqual(JSON.stringify(JSON.parse(b)), b);
  });

  test("the app ships every named trigger once, with output, sample and secret key params", () => {
    for (const [key, trigger] of NAMED) {
      const matches = app.triggers.filter((t) => t.key === key);
      assert.equal(matches.length, 1, key);
      const t = matches[0];
      assert.ok(t.output.length > 0, key);
      assert.equal((t.sample as { trigger: string }).trigger, trigger, key);
      assert.equal(t.params!.find((p) => p.key === "primaryKey")!.type, "secret", key);
      assert.equal(t.params!.find((p) => p.key === "secondaryKey")!.type, "secret", key);
      assert.equal(typeof t.poll, "undefined", key);
    }
  });

  for (const [key, trigger, type] of NAMED) {
    const t = () => app.triggers.find((x) => x.key === key)!;
    const body = bodyFor(trigger, type);

    describe(key, () => {
      test("onSubscribe registers exactly this one Box trigger on the folder", async () => {
        const m = mockCtx([{ body: { entries: [] } }, { body: { id: "WH9" } }]);
        const state = await t().onSubscribe!(
          { params: { targetId: "42" }, subscriptionId: "s", callbackUrl: CALLBACK, hostUrl: "h" },
          m.ctx,
        );
        assert.deepEqual(JSON.parse(m.calls[1].body!), {
          target: { id: "42", type: "folder" },
          address: CALLBACK,
          triggers: [trigger],
        });
        assert.deepEqual(state, {
          webhookId: "WH9",
          targetType: "folder",
          targetId: "42",
          triggers: [trigger],
        });
      });

      test("a valid signature -> one event with the item", async () => {
        const ts = stamp();
        const raw = call(body, {
          "box-delivery-timestamp": ts,
          "box-signature-primary": sign(body, ts, KEY),
        });
        const [e] = evs(await ingest(t(), raw, PARAMS, trigger)) as Array<Record<string, unknown>>;
        assert.deepEqual(
          [e.eventId, e.trigger, e.sourceType, e.sourceId, e.sourceName],
          ["EV9", trigger, type, "555", "thing"],
        );
      });

      test("one flipped byte of the SIGNATURE -> refused", async () => {
        const ts = stamp();
        const good = sign(body, ts, KEY);
        assert.notEqual(flip(good), good);
        const raw = call(body, {
          "box-delivery-timestamp": ts,
          "box-signature-primary": flip(good),
        });
        await assert.rejects(ingest(t(), raw, PARAMS, trigger), /does not match/);
      });

      test("one flipped byte of the BODY -> refused", async () => {
        const ts = stamp();
        const raw = call(body.replace("EV9", "EV8"), {
          "box-delivery-timestamp": ts,
          "box-signature-primary": sign(body, ts, KEY),
        });
        await assert.rejects(ingest(t(), raw, PARAMS, trigger), /does not match/);
      });

      test("signature header missing, rawBody absent, stale timestamp -> refused", async () => {
        const ts = stamp();
        await assert.rejects(
          ingest(t(), call(body, { "box-delivery-timestamp": ts }), PARAMS, trigger),
          /does not match/,
        );
        await assert.rejects(
          ingest(
            t(),
            call(undefined, {
              "box-delivery-timestamp": ts,
              "box-signature-primary": sign(body, ts, KEY),
            }),
            PARAMS,
            trigger,
          ),
          /raw body/,
        );
        const old = stamp(-660);
        await assert.rejects(
          ingest(
            t(),
            call(body, {
              "box-delivery-timestamp": old,
              "box-signature-primary": sign(body, old, KEY),
            }),
            PARAMS,
            trigger,
          ),
          /outside the allowed window/,
        );
      });

      test("an unset or empty signature key refuses before any compare", async () => {
        const ts = stamp();
        for (const params of [{}, { primaryKey: "" }]) {
          await assert.rejects(ingest(t(), call(body, {}), params, trigger), /not configured/);
          const forged = call(body, {
            "box-delivery-timestamp": ts,
            "box-signature-primary": createHmac("sha256", "").update(body).update(ts).digest(
              "base64",
            ),
          });
          await assert.rejects(ingest(t(), forged, params, trigger), /not configured/);
        }
      });

      test("a different Box trigger on a valid signature is acknowledged without an event", async () => {
        const other = trigger === "FILE.DELETED" ? "FILE.MOVED" : "FILE.DELETED";
        const ob = bodyFor(other, type);
        const ts = stamp();
        const raw = call(ob, {
          "box-delivery-timestamp": ts,
          "box-signature-primary": sign(ob, ts, KEY),
        });
        assert.deepEqual(evs(await ingest(t(), raw, PARAMS, trigger)), []);
      });
    });
  }

  test("activity (the Any-event trigger) filters on the registered list: listed passes, others do not", async () => {
    const activity = app.triggers.find((x) => x.key === "activity")!;
    const ts = stamp();
    const b1 = bodyFor("COMMENT.CREATED", "file");
    const b2 = bodyFor("FILE.LOCKED", "file");
    const mk = (b: string) =>
      call(b, { "box-delivery-timestamp": ts, "box-signature-primary": sign(b, ts, KEY) });
    const state = {
      webhookId: "WH9",
      targetType: "folder",
      targetId: "0",
      triggers: ["COMMENT.CREATED"],
    };
    const run = (b: string) =>
      Promise.resolve().then(() =>
        (activity as TriggerDefinition<Record<string, unknown>, unknown, unknown>).handleIngest!(
          { raw: mk(b), params: PARAMS, state, subscriptionId: "s" },
          mockCtx().ctx,
        )
      );
    assert.equal(evs(await run(b1)).length, 1);
    assert.deepEqual(evs(await run(b2)), []);
    const flipped = call(b1, {
      "box-delivery-timestamp": ts,
      "box-signature-primary": flip(sign(b1, ts, KEY)),
    });
    await assert.rejects(
      Promise.resolve().then(() =>
        (activity as TriggerDefinition<Record<string, unknown>, unknown, unknown>).handleIngest!(
          { raw: flipped, params: PARAMS, state, subscriptionId: "s" },
          mockCtx().ctx,
        )
      ),
      /does not match/,
    );
  });
});
