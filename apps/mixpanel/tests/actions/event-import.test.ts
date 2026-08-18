import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/event-import.ts";

const conn = { display: { projectId: "123", region: "us" } };
const ok = { status: 200, body: { code: 200, num_records_imported: 1, status: "OK" } };
const event = {
  event: "Signed Up",
  properties: { time: 1755000000000, distinct_id: "u1", $insert_id: "abc-123" },
};

/** /import authenticates and validates, unlike /track. */
Deno.test("event-import: posts to the ingestion host with strict validation on", async () => {
  const { ctx, calls } = mockCtx([ok], conn);
  await action.execute!({ events: JSON.stringify([event]) }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.host, "api.mixpanel.com");
  assertEquals(url.pathname, "/import");
  assertEquals(url.searchParams.get("strict"), "1");
  assertEquals(url.searchParams.get("project_id"), "123");
});

/**
 * $insert_id is what Mixpanel deduplicates on. Without it, a retried workflow
 * double-counts — so the action refuses rather than letting Mixpanel mint one.
 */
Deno.test("event-import: an event without $insert_id is refused, with the reason", async () => {
  const { ctx, calls } = mockCtx([], conn);
  const err = await assertRejects(
    async () =>
      await action.execute!({
        events: JSON.stringify([{ event: "x", properties: { time: 1, distinct_id: "u" } }]),
      }, ctx),
    Error,
  );
  assert(/\$insert_id/.test(String(err)), String(err));
  assert(/double-count/.test(String(err)), String(err));
  assertEquals(calls.length, 0);
});

Deno.test("event-import: missing time or distinct_id is caught with the index", async () => {
  const noTime = mockCtx([], conn);
  await assertRejects(
    async () =>
      await action.execute!({
        events: JSON.stringify([{ event: "x", properties: { distinct_id: "u", $insert_id: "i" } }]),
      }, noTime.ctx),
    Error,
    "properties.time",
  );

  const noId = mockCtx([], conn);
  await assertRejects(
    async () =>
      await action.execute!({
        events: JSON.stringify([{ event: "x", properties: { time: 1, $insert_id: "i" } }]),
      }, noId.ctx),
    Error,
    "distinct_id",
  );
});

Deno.test("event-import: a batch over 2000 is refused before the wire", async () => {
  const { ctx, calls } = mockCtx([], conn);
  const many = Array.from({ length: 2001 }, (_, i) => ({
    event: "x",
    properties: { time: 1, distinct_id: "u", $insert_id: `i${i}` },
  }));
  await assertRejects(
    async () => await action.execute!({ events: JSON.stringify(many) }, ctx),
    Error,
    "2000",
  );
  assertEquals(calls.length, 0);
});

/** Stable insert ids are exactly what make this safe to retry. */
Deno.test("event-import: declares itself idempotent", () => {
  assertEquals(action.idempotent, true);
});

Deno.test("event-import: strict can be turned off, and the hint says what that costs", () => {
  const p = (action.params as Array<{ key: string; hint?: string }>).find((p) =>
    p.key === "strict"
  )!;
  assert(/silently dropped/.test(p.hint!), p.hint);
});
