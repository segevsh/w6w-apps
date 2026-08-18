import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/repo-files.ts";

const tree = {
  status: 200,
  body: [
    { path: "config.json", size: 665, type: "file" },
    // An LFS entry: `size` is the pointer's, `lfs.size` is the file's.
    { path: "model.safetensors", size: 135, type: "file", lfs: { size: 548_105_171 } },
  ],
};

Deno.test("repo-files: walks the tree at a revision", async () => {
  const { ctx, calls } = mockCtx([tree]);
  await action.execute({ id: "openai-community/gpt2", revision: "main" }, ctx);
  assertEquals(
    calls[0].url,
    "https://huggingface.co/api/models/openai-community/gpt2/tree/main",
  );
});

Deno.test("repo-files: the kind selects the endpoint, and a path scopes it", async () => {
  const { ctx, calls } = mockCtx([tree]);
  await action.execute({ kind: "datasets", id: "d/s", path: "/data", recursive: true }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/datasets/d/s/tree/main/data");
  assertEquals(url.searchParams.get("recursive"), "true");
});

/** Summing `size` is wrong by orders of magnitude and looks plausible. */
Deno.test("repo-files: the total takes LFS entries from lfs.size", async () => {
  const { ctx } = mockCtx([tree]);
  const result = await action.execute({ id: "openai-community/gpt2" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(result.totalBytes, 665 + 548_105_171);
  assertEquals(result.count, 2);
  assertEquals(result.paths, ["config.json", "model.safetensors"]);
});

/** Loading a pickle runs whatever is in it; the model card does not say. */
Deno.test("repo-files: flags safetensors and pickles from the file names", async () => {
  const safe = mockCtx([tree]);
  const safeResult = await action.execute({ id: "a/b" }, safe.ctx) as Record<string, unknown>;
  assertEquals(safeResult.hasSafetensors, true);
  assertEquals(safeResult.hasPickle, false);

  const pickled = mockCtx([{
    status: 200,
    body: [{ path: "pytorch_model.bin", size: 100 }, { path: "extra.pt", size: 10 }],
  }]);
  const pickledResult = await action.execute({ id: "a/b" }, pickled.ctx) as Record<string, unknown>;
  assertEquals(pickledResult.hasSafetensors, false);
  assertEquals(pickledResult.hasPickle, true);
});

Deno.test("repo-files: an empty or non-list body yields nothing rather than throwing", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { error: "nope" } }]);
  const result = await action.execute({ id: "a/b" }, ctx) as Record<string, unknown>;
  assertEquals(result.count, 0);
  assertEquals(result.totalBytes, 0);
});

/** A workflow pinned to `main` gets different weights on different days. */
Deno.test("repo-files: the revision hint says main moves", () => {
  const revision = action.params!.find((p) => p.key === "revision")!;
  assert(/MOVES/.test(revision.hint!), revision.hint);
  assert(/LFS POINTER/.test(action.description!), action.description);
});
