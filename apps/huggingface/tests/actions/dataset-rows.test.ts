import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/dataset-rows.ts";

const page = {
  status: 200,
  body: {
    rows: [{ row: { question: "a" } }, { row: { question: "b" } }],
    features: [{ name: "question", type: { dtype: "string" } }],
    num_rows_total: 87599,
  },
};

/** Rows come from a different host to everything else in this app. */
Deno.test("dataset-rows: reads the datasets-server, not the Hub", async () => {
  const { ctx, calls } = mockCtx([page]);
  await action.execute({ dataset: "rajpurkar/squad", config: "plain_text", split: "train" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.host, "datasets-server.huggingface.co");
  assertEquals(url.pathname, "/rows");
  assertEquals(url.searchParams.get("dataset"), "rajpurkar/squad");
  assertEquals(url.searchParams.get("config"), "plain_text");
  assertEquals(url.searchParams.get("split"), "train");
});

/** Each entry wraps the row, which is rarely what a caller wants. */
Deno.test("dataset-rows: unwraps the rows and reports the split's real total", async () => {
  const { ctx } = mockCtx([page]);
  const result = await action.execute(
    { dataset: "rajpurkar/squad", config: "plain_text", split: "train" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(result.rows, [{ question: "a" }, { question: "b" }]);
  assertEquals(result.count, 2);
  assertEquals(result.totalRows, 87599);
  assertEquals(result.hasMore, true);
});

Deno.test("dataset-rows: the last page reports no more", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { rows: [{ row: { q: "z" } }], num_rows_total: 11 },
  }]);
  const result = await action.execute(
    { dataset: "d/s", config: "c", split: "train", offset: 10, length: 10 },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(result.hasMore, false);
});

/** The service caps a page at 100, and a larger request is not an error. */
Deno.test("dataset-rows: the page size is clamped to what the service allows", async () => {
  const { ctx, calls } = mockCtx([page]);
  await action.execute(
    { dataset: "d/s", config: "c", split: "train", length: 5000, offset: -3 },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("length"), "100");
  assertEquals(url.searchParams.get("offset"), "0");
});

/**
 * The names are the dataset author's own and vary completely, so guessing
 * `train` works often enough to be misleading.
 */
Deno.test("dataset-rows: config and split are demanded, and the error says where to find them", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await action.execute({ dataset: "rajpurkar/squad", split: "train" }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/`config` is required/.test(message), message);
  assert(/dataset-get/.test(message), message);
  assertEquals(calls.length, 0);
});

/** The Hub would have redirected; this host answers 404 with a message. */
Deno.test("dataset-rows: a renamed dataset fails here rather than redirecting", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error: "The dataset has been renamed" },
  }]);
  let message = "";
  try {
    await action.execute({ dataset: "squad", config: "plain_text", split: "train" }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/404/.test(message), message);
  assert(/rajpurkar\/squad/.test(message), message);
});

Deno.test("dataset-rows: logs the count and the offset, never the rows", async () => {
  const { ctx, logs } = mockCtx([page]);
  await action.execute({ dataset: "d/s", config: "c", split: "train" }, ctx);
  assertEquals(logs[0].data, { count: 2, offset: 0 });
});
