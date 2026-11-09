import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-document.ts";

const input = { params: { doctype: "Lead" }, subscriptionId: "sub-1" };
const item = (name: string, modified: string) => ({
  name,
  creation: "2026-11-09 12:00:00",
  modified,
});
const ctx = (data: unknown[]) =>
  mockCtx([{ body: { data } }], { display: { baseUrl: "https://erpnext.example.com" } });

test("new-or-updated-document: seeds, emits edits, retries idempotently, requests newest updated first", async () => {
  const seed = ctx([item("a", "2026-11-09 12:00:00")]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://erpnext.example.com/api/resource/Lead?fields=%5B%22name%22%2C%22creation%22%2C%22modified%22%5D&order_by=modified+desc&limit_start=0&limit_page_length=100",
  );
  const page = [item("a", "2026-11-09 13:00:00"), item("a", "2026-11-09 12:00:00")];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [item("a", "2026-11-09 13:00:00")]);
  assertEquals(retry, first);
});
