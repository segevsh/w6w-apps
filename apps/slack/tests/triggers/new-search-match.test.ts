import { test } from "node:test";
import assert from "node:assert/strict";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-search-match.ts";

const match = (ts: string, text = "Invoice overdue") => ({
  iid: `iid-${ts}`,
  type: "message",
  channel: { id: "C1", name: "support" },
  user: "U1",
  ts,
  text,
});
const page = (...matches: unknown[]) => ({ ok: true, messages: { matches } });

async function poll(body: unknown, state: unknown) {
  const mock = mockCtx([{ body }]);
  const result = await trigger.poll!({ params: { query: "invoice" }, state }, mock.ctx);
  return { ...mock, result };
}

test("new-search-match: seeds without emitting, emits only new matches, retries idempotently", async () => {
  const seeded = await poll(page(match("200.1"), match("100.1")), {});
  assert.deepEqual(seeded.result.events, []);
  assert.equal(seeded.result.nextState.seeded, true);

  const changed = await poll(
    page(match("300.1"), match("200.1"), match("100.1")),
    seeded.result.nextState,
  );
  assert.deepEqual(changed.result.events, [match("300.1")]);
  const again = await poll(
    page(match("300.1"), match("200.1"), match("100.1")),
    seeded.result.nextState,
  );
  assert.deepEqual(again.result, changed.result);
});

test("new-search-match: asks Slack for the newest matches first, with the literal request", async () => {
  const { calls } = await poll(page(), {});
  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, "POST");
  const url = new URL(calls[0].url);
  assert.equal(url.origin + url.pathname, "https://slack.com/api/search.messages");
  assert.equal(
    url.search,
    "?query=invoice&sort=timestamp&sort_dir=desc&count=100",
  );
});

test("new-search-match: a match is identified by channel and timestamp, so an edit of the text is not new", async () => {
  const seeded = await poll(page(match("100.1", "before")), {});
  const edited = await poll(page(match("100.1", "after")), seeded.result.nextState);
  assert.deepEqual(edited.result.events, []);
});

test("new-search-match: declares output, sample and a required query", () => {
  assert.ok(trigger.output.length > 0);
  assert.notEqual(trigger.sample, undefined);
  assert.equal(trigger.params!.find((p) => p.key === "query")!.required, true);
  assert.equal(typeof trigger.poll, "function");
  assert.equal(trigger.onSubscribe, undefined);
});
