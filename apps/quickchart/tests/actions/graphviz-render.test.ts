import { assertEquals } from "@std/assert";
import action from "../../actions/graphviz-render.ts";
import { exec, IMG_HEADERS, mockCtx, PNG, SVG } from "../_helpers.ts";

Deno.test("graphviz-render: defaults to svg and the dot engine is left to the vendor", async () => {
  const { ctx, calls } = mockCtx([{ headers: { "content-type": "image/svg+xml" }, body: SVG }]);
  const out = await exec(action, { graph: "digraph{a->b}" }, ctx);
  assertEquals(calls[0].url, "https://quickchart.io/graphviz");
  assertEquals(JSON.parse(calls[0].body!), { graph: "digraph{a->b}", format: "svg" });
  assertEquals(out.svg, SVG);
});

Deno.test("graphviz-render: png with engine and size", async () => {
  const { ctx, calls, created } = mockCtx([{ headers: IMG_HEADERS, body: PNG }], { files: true });
  await exec(action, {
    graph: "graph{a--b}",
    format: "png",
    engine: "neato",
    width: 400,
    height: 300,
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).engine, "neato");
  assertEquals(created[0].filename, "graph.png");
});
