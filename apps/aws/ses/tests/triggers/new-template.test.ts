import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-template.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const meta = (name: string) => ({
  TemplateName: name,
  CreatedTimestamp: "2026-11-09T10:00:00.000Z",
});
const item = (name: string) => ({
  templateName: name,
  createdTimestamp: "2026-11-09T10:00:00.000Z",
});
const page = (names: string[], next?: string) => ({
  body: { TemplatesMetadata: names.map(meta), ...(next ? { NextToken: next } : {}) },
});

test("new-template seeds, emits only the new template, and retries identically", async () => {
  const seed = mockCtx([page(["a", "b"])]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://email.us-east-1.amazonaws.com/v2/email/templates?PageSize=1000",
  );
  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([page(["a", "b", "c"])]).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([page(["a", "b", "c"])]).ctx,
  );
  assertEquals(first.events, [item("c")]);
  assertEquals(retry, first);
});

test("new-template follows NextToken across pages and stops with an error past 5 pages", async () => {
  const two = mockCtx([page(["a"], "t1"), page(["b"])]);
  await trigger.poll!({ ...input, state: {} }, two.ctx);
  assertEquals(two.calls.length, 2);
  assertEquals(
    two.calls[1].url,
    "https://email.us-east-1.amazonaws.com/v2/email/templates?PageSize=1000&NextToken=t1",
  );
  const endless = mockCtx(Array.from({ length: 6 }, (_, i) => page([`n${i}`], `t${i}`)));
  await assertRejects(() => trigger.poll!({ ...input, state: {} }, endless.ctx), Error, "5000");
  assertEquals(endless.calls.length, 5);
});
