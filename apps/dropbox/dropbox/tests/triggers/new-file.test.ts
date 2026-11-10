import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-file.ts";

const input = { params: { path: "/Invoices" }, subscriptionId: "sub-1" };
const item = (id: string) => ({
  ".tag": "file",
  id,
  name: `${id}.pdf`,
  path_lower: `/invoices/${id}.pdf`,
  rev: "r1",
});
const page = (items: unknown[]) => ({ body: { entries: items, cursor: "c1", has_more: false } });

test("new-file: seeds, emits only new entries, retries idempotently, lists the named folder", async () => {
  const seed = mockCtx([page([item("id:a")])]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "POST");
  assertEquals(new URL(seed.calls[0].url).pathname, "/2/files/list_folder");
  const body = JSON.parse(seed.calls[0].body!);
  assertEquals(body.path, "/Invoices");
  assertEquals(body.recursive, false);
  assertEquals(body.limit, 200);

  const items = [item("id:a"), item("id:b")];
  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([page(items)]).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([page(items)]).ctx,
  );
  assertEquals(first.events, [item("id:b")]);
  assertEquals(retry, first);
});
