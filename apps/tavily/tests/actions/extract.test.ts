import { assert, assertEquals } from "@std/assert";
import extract from "../../actions/extract.ts";
import { mockCtx, pathOf, rejection } from "../_helpers.ts";

Deno.test("extract: splits URLs and returns failed_results untouched", async () => {
  const body = {
    results: [{ url: "https://a.com", raw_content: "x" }],
    failed_results: [{ url: "https://b.com", error: "Failed to retrieve content" }],
  };
  const { ctx, calls } = mockCtx([{ body }]);
  const out = await extract.execute({
    urls: "https://a.com\nhttps://b.com",
    extractDepth: "advanced",
    query: "",
  }, ctx);
  assertEquals(out, body);
  assertEquals(pathOf(calls[0].url), "/extract");
  assertEquals(JSON.parse(calls[0].body!), {
    urls: ["https://a.com", "https://b.com"],
    extract_depth: "advanced",
  });
});

Deno.test("extract: refuses an empty list and more than 20 URLs before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await rejection(() => extract.execute({ urls: " " }, ctx));
  const many = Array.from({ length: 21 }, (_, i) => `https://e.com/${i}`).join(",");
  const err = await rejection(() => extract.execute({ urls: many }, ctx));
  assert(err.message.includes("at most 20"));
  assertEquals(calls.length, 0);
});
