import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/dataset-search.ts";

Deno.test("dataset-search: hits the datasets endpoint", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  await action.execute({ search: "squad" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/datasets");
  assertEquals(url.searchParams.get("search"), "squad");
  assertEquals(action.resource, "dataset");
});

/** A dataset search has no task, so no `pipelineTag`. */
Deno.test("dataset-search: takes tags but not a task", () => {
  assertEquals(action.params!.some((p) => p.key === "pipelineTag"), false);
  const filter = action.params!.find((p) => p.key === "filter")!;
  assert(/All of them must match/.test(filter.hint!), filter.hint);
});

Deno.test("dataset-search: reports how many are gated", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: [{ id: "rajpurkar/squad" }, { id: "closed/one", gated: "auto" }],
  }]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.count, 2);
  assertEquals(result.gatedCount, 1);
});

Deno.test("dataset-search: paging is by opaque cursor", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  await action.execute({ cursor: "PREV" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("cursor"), "PREV");
  const result = await (async () => {
    const next = mockCtx([{
      status: 200,
      body: [],
      headers: {
        "content-type": "application/json",
        link: '<https://huggingface.co/api/datasets?cursor=NEXT>; rel="next"',
      },
    }]);
    return await action.execute({}, next.ctx) as Record<string, unknown>;
  })();
  assertEquals(result.cursor, "NEXT");
});

Deno.test("dataset-search: the licence lives in the tags, and the description says so", () => {
  assert(/licence/.test(action.description!), action.description);
});
