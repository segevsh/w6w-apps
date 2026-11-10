import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-job.ts";

const display = { endpoint: "https://ci.example.com" };
const input = { params: {}, subscriptionId: "sub-1" };
const job = (name: string) => ({
  name,
  url: `https://ci.example.com/job/${name}/`,
  color: "blue",
  buildable: true,
});

test("new-job: seeds, emits additions, retries idempotently, and requests the job tree", async () => {
  const seed = mockCtx([{ body: { jobs: [job("a")] } }], { display });
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://ci.example.com/api/json?tree=jobs%5Bname%2Curl%2Ccolor%2Cbuildable%5D",
  );
  const next = { jobs: [job("a"), job("b")] };
  const run = () =>
    trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([{ body: next }], { display }).ctx,
    );
  const first = await run();
  assertEquals(first.events, [{ change: "added", key: job("b").url, values: job("b") }]);
  assertEquals(await run(), first);
});
