import { assertEquals } from "@std/assert";
import map from "../../actions/map.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("map: posts to /map and returns the URL list", async () => {
  const { ctx, calls } = mockCtx([{
    body: { base_url: "https://d.com", results: ["https://d.com/a"] },
  }]);
  const out = await map.execute({ url: "https://d.com", maxDepth: 3, selectPaths: "/a" }, ctx);
  assertEquals(out, { base_url: "https://d.com", results: ["https://d.com/a"] });
  assertEquals(pathOf(calls[0].url), "/map");
  assertEquals(JSON.parse(calls[0].body!), {
    url: "https://d.com",
    max_depth: 3,
    select_paths: ["/a"],
  });
});

Deno.test("map: declares no content-extraction params", () => {
  const keys = map.params!.map((p) => p.key);
  for (const k of ["extractDepth", "format", "includeImages"]) {
    assertEquals(keys.includes(k), false);
  }
});
