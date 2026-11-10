import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-employee-file.ts";

const input = { params: { employeeId: "42" }, subscriptionId: "sub-1" };
const file = (id: number, name = `File ${id}`) => ({
  id,
  name,
  originalFileName: `${name}.pdf`,
  size: 10,
  dateCreated: "2026-11-09T16:50:52+0000",
  createdBy: "John Doe",
});
const listing = (...files: Array<Record<string, unknown>>) => ({
  employee: { id: 42 },
  categories: [{ id: 1, name: "New Hire Docs", files }, { id: 112, name: "Training Docs" }],
});

test("new-employee-file: seeds, emits only the new file with its category, retries idempotently", async () => {
  const seed = mockCtx([{ body: listing(file(1)) }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(seed.calls[0].url, "https://acme.bamboohr.com/api/v1/employees/42/files/view");

  const body = listing(file(1), file(2));
  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body }]).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body }]).ctx,
  );
  assertEquals(first.events, [{
    ...file(2),
    id: "2",
    categoryId: "1",
    categoryName: "New Hire Docs",
  }]);
  assertEquals(retry, first);
});

test("new-employee-file: a 404 (no accessible categories) is an empty list, other errors propagate", async () => {
  const empty = await trigger.poll!(
    { ...input, state: {} },
    mockCtx([{ status: 404, statusText: "Not Found", body: "none" }]).ctx,
  );
  assertEquals(empty.events, []);
  assertEquals((empty.nextState as { seeded?: boolean }).seeded, true);
  let thrown = false;
  try {
    await trigger.poll!(
      { ...input, state: {} },
      mockCtx([{ status: 403, statusText: "Forbidden", body: "no" }]).ctx,
    );
  } catch {
    thrown = true;
  }
  assertEquals(thrown, true);
});
