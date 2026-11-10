import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-pipeline.ts";

const input = { params: { projectSlug: "gh/acme/widgets" }, subscriptionId: "sub-1" };
const pipeline = (id: string) => ({ id });

test("new-pipeline: seeds, emits only new pipelines, retries idempotently, requests project pipelines", async () => {
  const seed = mockCtx([{ body: { items: [pipeline("a")] } }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(seed.calls[0].url, "https://circleci.com/api/v2/project/gh/acme/widgets/pipeline");

  const response = { items: [pipeline("b"), pipeline("a")] };
  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: response }]).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: response }]).ctx,
  );
  assertEquals(first.events, [pipeline("b")]);
  assertEquals(retry, first);
});

test("new-pipeline: finds a new pipeline on a later page whatever the list order", async () => {
  const prior = { v: 1, kind: "ids", seeded: true, ids: ["a", "b"] };
  const ctx = mockCtx([
    { body: { items: [pipeline("a"), pipeline("b")], next_page_token: "tok" } },
    { body: { items: [pipeline("c")] } },
  ]);
  const out = await trigger.poll!({ ...input, state: prior }, ctx.ctx);
  assertEquals(out.events, [pipeline("c")]);
  assertEquals(
    ctx.calls[1].url,
    "https://circleci.com/api/v2/project/gh/acme/widgets/pipeline?page-token=tok",
  );
});
