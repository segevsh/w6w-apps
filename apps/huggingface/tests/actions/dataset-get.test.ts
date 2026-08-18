import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/dataset-get.ts";

Deno.test("dataset-get: reads one dataset", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { id: "rajpurkar/squad", cardData: { license: "cc-by-sa-4.0" }, sha: "abc" },
  }]);
  const result = await action.execute({ id: "rajpurkar/squad" }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://huggingface.co/api/datasets/rajpurkar/squad");
  assertEquals(result.id, "rajpurkar/squad");
  assertEquals(result.sha, "abc");
});

/** Nothing enforces the licence at download time. */
Deno.test("dataset-get: the card carries the licence, and the description points at it", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { id: "rajpurkar/squad", cardData: { license: "cc-by-sa-4.0", configs: ["plain_text"] } },
  }]);
  const result = await action.execute({ id: "rajpurkar/squad" }, ctx) as Record<string, unknown>;
  const dataset = result.dataset as Record<string, unknown>;
  assertEquals((dataset.cardData as Record<string, unknown>).license, "cc-by-sa-4.0");
  assert(/license/.test(action.description!), action.description);
});

Deno.test("dataset-get: a gated dataset reads its metadata fine", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { id: "closed/one", gated: "manual" } }]);
  const result = await action.execute({ id: "closed/one" }, ctx) as Record<string, unknown>;
  assertEquals(result.gated, true, "the gate blocks files, not the card");
});

Deno.test("dataset-get: a revision pins the read", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "rajpurkar/squad" } }]);
  await action.execute({ id: "rajpurkar/squad", revision: "refs/convert/parquet" }, ctx);
  assertEquals(
    calls[0].url,
    "https://huggingface.co/api/datasets/rajpurkar/squad/revision/refs%2Fconvert%2Fparquet",
  );
});

Deno.test("dataset-get: the output is keyed by its kind", () => {
  const outputs = action.output as Array<{ key: string }>;
  assertEquals(outputs.some((entry) => entry.key === "dataset"), true);
  assertEquals(action.type, "read");
});
