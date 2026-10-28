import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import listModels from "../../actions/list-models.ts";

const display = { projectId: "p1", location: "us-central1" };
const BASE = "https://us-central1-aiplatform.googleapis.com/v1/projects/p1/locations/us-central1";

Deno.test("list-models: GETs /models with a filter and pageSize", async () => {
  const { ctx, calls } = mockCtx([{ body: { models: [{ name: "m1" }] } }], { display });
  const out = await listModels.execute!({ filter: 'display_name="x"', limit: 10 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(`${url.origin}${url.pathname}`, `${BASE}/models`);
  assertEquals(url.searchParams.get("filter"), 'display_name="x"');
  assertEquals(url.searchParams.get("pageSize"), "10");
  assertEquals(out, { items: [{ name: "m1" }], nextPageToken: undefined });
});
