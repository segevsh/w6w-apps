import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/snapshot-create.ts";

const droplet = (status: string) => ({ status: 200, body: { droplet: { status } } });
const accepted = { status: 201, body: { action: { id: 7654321, status: "in-progress" } } };

Deno.test("snapshot-create: checks the droplet, then posts the snapshot action", async () => {
  const { ctx, calls } = mockCtx([droplet("off"), accepted]);
  const result = await action.execute(
    { dropletId: "3164444", name: "pre-upgrade" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(JSON.parse(calls[1].body!), { type: "snapshot", name: "pre-upgrade" });
  assertEquals(result.status, "in-progress");
  assertEquals(result.crashConsistent, false);
});

/** Allowed, and the same state as after a power cut. */
Deno.test("snapshot-create: a running droplet gives a crash-consistent snapshot, and warns", async () => {
  const { ctx, logs } = mockCtx([droplet("active"), accepted]);
  const result = await action.execute(
    { dropletId: "3164444", name: "nightly" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(result.crashConsistent, true);
  assertEquals(logs[0].level, "warn");
  assert(/as though the power had been cut/.test(logs[0].message), logs[0].message);
  assert(/may need recovery on restore/.test(logs[0].message), logs[0].message);
});

/** Nothing else records why a snapshot was taken. */
Deno.test("snapshot-create: a name is required, and says why", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await action.execute({ dropletId: "3164444" }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/only description the snapshot will ever have/.test(message), message);
  assertEquals(calls.length, 0);
});

/** Insurance with a monthly premium and no cancellation date. */
Deno.test("snapshot-create: reports that it bills monthly forever", async () => {
  const { ctx } = mockCtx([droplet("off"), accepted]);
  const result = await action.execute(
    { dropletId: "3164444", name: "x" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(result.billsMonthly, true);
  assert(/bills per gigabyte per month FOREVER/.test(action.description!), action.description);
  assertEquals(action.idempotent, false);
});
