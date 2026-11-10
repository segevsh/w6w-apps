import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-model.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const models = (...ids: Array<[string, string?]>) => ({
  data: ids.map(([id, owner]) => ({ id, object: "model", owned_by: owner ?? "perplexity" })),
});

test("new-model: seeds without emitting and requests GET /v1/models", async () => {
  const seed = mockCtx([{ body: models(["m-1"]) }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(seed.calls[0].url, "https://api.perplexity.ai/v1/models");
});

test("new-model: emits only an added model, retries idempotently, ignores an edited row", async () => {
  const seeded = await trigger.poll!(
    { ...input, state: {} },
    mockCtx([{ body: models(["m-1"]) }]).ctx,
  );
  const page = models(["m-1"], ["m-2"]);
  const run = () =>
    trigger.poll!({ ...input, state: seeded.nextState }, mockCtx([{ body: page }]).ctx);
  const first = await run();
  assertEquals(first.events, [{
    change: "added",
    key: "m-2",
    values: { id: "m-2", object: "model", owned_by: "perplexity" },
  }]);
  assertEquals(await run(), first);
  const edited = models(["m-1", "someone-else"], ["m-2"]);
  const noUpdate = await trigger.poll!(
    { ...input, state: first.nextState },
    mockCtx([{ body: edited }]).ctx,
  );
  assertEquals(noUpdate.events, []);
});
