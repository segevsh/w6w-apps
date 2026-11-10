import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-build.ts";

const display = { endpoint: "https://ci.example.com" };
const input = { params: { job: "my-job" }, subscriptionId: "sub-1" };
const build = (n: number) => ({ number: n, url: `https://ci.example.com/job/my-job/${n}/` });
// Deliberately oldest-first: the trigger must not depend on the vendor's order.
const page = (...ns: number[]) => ({ body: { name: "my-job", builds: ns.map(build) } });

test("new-build: seeds without emitting and requests the job model", async () => {
  const seed = mockCtx([page(1, 2, 3)], { display });
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(seed.calls[0].url, "https://ci.example.com/job/my-job/api/json");
});

test("new-build: emits the new build only, in any vendor order, and is idempotent", async () => {
  const seeded = await trigger.poll!(
    { ...input, state: {} },
    mockCtx([page(1, 2, 3)], { display }).ctx,
  );
  const run = () =>
    trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([page(1, 2, 3, 4)], { display }).ctx,
    );
  const first = await run();
  assertEquals(first.events, [build(4)]);
  assertEquals(await run(), first);
});
