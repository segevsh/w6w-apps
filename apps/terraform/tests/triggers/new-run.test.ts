import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-run.ts";

const item = (id: string) => ({ id, attributes: { status: "planned" } });
const body = (items: unknown[]) => ({ data: items });
const input = { params: { workspaceId: "ws-1" }, subscriptionId: "sub-1" };

test("new-run seeds, emits new rows, retries, and requests the literal workspace run feed", async () => {
  const seed = mockCtx([{ body: body([item("a")]) }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://app.terraform.io/api/v2/workspaces/ws-1/runs?page%5Bsize%5D=100&page%5Bnumber%5D=1",
  );
  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: body([item("b"), item("a")]) }]).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: body([item("b"), item("a")]) }]).ctx,
  );
  assertEquals(first.events, [{ id: "b", status: "planned", type: undefined }]);
  assertEquals(retry, first);
});
