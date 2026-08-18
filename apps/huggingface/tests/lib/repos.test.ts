import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { nextCursor, searchAction } from "../../lib/repos.ts";
import modelSearch from "../../actions/model-search.ts";
import modelGet from "../../actions/model-get.ts";

/**
 * Reading the cursor off the requested URL returns the page just fetched, so a
 * paging loop asks for page one forever while looking like it works.
 */
Deno.test("nextCursor: comes out of the Link header, not the request", () => {
  assertEquals(
    nextCursor('<https://huggingface.co/api/models?cursor=ZmFrZQ%3D%3D&limit=20>; rel="next"'),
    "ZmFrZQ==",
  );
  assertEquals(
    nextCursor(
      '<https://x/api/models?cursor=a>; rel="prev", <https://x/api/models?cursor=b>; rel="next"',
    ),
    "b",
  );
});

Deno.test("nextCursor: the last page has no Link header, which is how paging ends", () => {
  assertEquals(nextCursor(null), undefined);
  assertEquals(nextCursor('<https://x/api/models>; rel="prev"'), undefined);
  assertEquals(nextCursor("garbage"), undefined);
});

Deno.test("search: the three kinds hit their own endpoint and sort sensibly", async () => {
  for (
    const [kind, sort] of [["models", "downloads"], ["datasets", "downloads"], ["spaces", "likes"]]
  ) {
    const action = searchAction({ kind: kind as "models", key: "k", title: "t", description: "d" });
    const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
    await action.execute({ sort }, ctx);
    assert(calls[0].url.startsWith(`https://huggingface.co/api/${kind}?`), calls[0].url);
    assertEquals(action.params!.find((p) => p.key === "sort")!.default, sort);
  }
});

/** Nobody downloads a running application. */
Deno.test("search: Spaces are not offered a downloads sort at all", () => {
  const spaces = searchAction({ kind: "spaces", key: "k", title: "t", description: "d" });
  const options = spaces.params!.find((p) => p.key === "sort")!.options as Array<
    { value: string }
  >;
  assertEquals(options.some((option) => option.value === "downloads"), false);
});

Deno.test("search: tags are sent as one comma-joined filter", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  await modelSearch.execute({ filter: "pytorch, en", search: "whisper" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("filter"), "pytorch,en");
  assertEquals(url.searchParams.get("search"), "whisper");
});

/** Without the task filter a search returns fine-tunes of what was wanted. */
Deno.test("search: the model variant sends pipeline_tag, the others have no such param", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  await modelSearch.execute({ pipelineTag: "text-generation" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("pipeline_tag"), "text-generation");

  const datasets = searchAction({ kind: "datasets", key: "k", title: "t", description: "d" });
  assertEquals(datasets.params!.some((p) => p.key === "pipelineTag"), false);
});

Deno.test("search: reports how many results cannot be downloaded", async () => {
  const { ctx, logs } = mockCtx([{
    status: 200,
    body: [
      { id: "a/one", gated: false },
      { id: "b/two", gated: "auto" },
      { id: "c/three", gated: "manual" },
    ],
  }]);
  const result = await modelSearch.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.count, 3);
  assertEquals(result.gatedCount, 2);
  assertEquals(result.ids, ["a/one", "b/two", "c/three"]);
  assertEquals(logs[0].level, "info");
});

Deno.test("search: the cursor comes back off the Link header", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: [],
    headers: {
      "content-type": "application/json",
      link: '<https://huggingface.co/api/models?cursor=NEXT>; rel="next"',
    },
  }]);
  const result = await modelSearch.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.cursor, "NEXT");
});

Deno.test("search: a body that is not a list yields no results rather than throwing", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { error: "nope" } }]);
  const result = await modelSearch.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.count, 0);
});

Deno.test("detail: a revision goes down the /revision/ path", async () => {
  const plain = mockCtx([{ status: 200, body: { id: "openai-community/gpt2" } }]);
  await modelGet.execute({ id: "openai-community/gpt2" }, plain.ctx);
  assertEquals(plain.calls[0].url, "https://huggingface.co/api/models/openai-community/gpt2");

  const pinned = mockCtx([{ status: 200, body: { id: "openai-community/gpt2" } }]);
  await modelGet.execute({ id: "openai-community/gpt2", revision: "e7da7f2" }, pinned.ctx);
  assertEquals(
    pinned.calls[0].url,
    "https://huggingface.co/api/models/openai-community/gpt2/revision/e7da7f2",
  );
});

Deno.test("detail: reports the canonical id, the gate and the pin", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      id: "meta-llama/Llama-3.1-8B",
      gated: "manual",
      private: false,
      sha: "abc123",
      downloads: 42,
    },
  }]);
  const result = await modelGet.execute({ id: "meta-llama/Llama-3.1-8B" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(result.id, "meta-llama/Llama-3.1-8B");
  assertEquals(result.gated, true);
  assertEquals(result.private, false);
  assertEquals(result.sha, "abc123");
  assertEquals(result.renamed, false);
  assert(result.model, "the repository is returned under its own kind");
});

/**
 * A stored id that has been renamed keeps working, silently, until the day the
 * redirect is what breaks — this is the only thing that says so.
 */
Deno.test("detail: a rename is reported and the canonical id is returned", async () => {
  const { ctx, logs } = mockCtx([{ status: 200, body: { id: "openai-community/gpt2" } }]);
  const inner = ctx.fetch;
  ctx.fetch = (async (input: string, init?: RequestInit) => {
    const res = await (inner as (i: string, x?: RequestInit) => Promise<Response>)(input, init);
    Object.defineProperty(res, "url", {
      value: "https://huggingface.co/api/models/openai-community/gpt2",
    });
    return res;
  }) as typeof ctx.fetch;

  const result = await modelGet.execute({ id: "gpt2" }, ctx) as Record<string, unknown>;
  assertEquals(result.renamed, true);
  assertEquals(result.id, "openai-community/gpt2");
  assertEquals(logs[0].level, "warn");
  assert(/renamed/.test(logs[0].message), logs[0].message);
});

Deno.test("detail: the id hint and revision hint say what moves", () => {
  const id = modelGet.params!.find((p) => p.key === "id")!;
  assert(/redirects/.test(id.hint!), id.hint);
  const revision = modelGet.params!.find((p) => p.key === "revision")!;
  assert(/MOVES/.test(revision.hint!), revision.hint);
});
