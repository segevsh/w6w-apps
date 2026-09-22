import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/pipeline-list.ts";

Deno.test("pipeline-list: uses this endpoint's currPage/pageSize spelling", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { get_metadata: { total: 1 }, pipelines: [{ id: 100234, name: "Active" }] },
  }]);
  const result = await action.execute!({ name: "Act", currPage: 0, pageSize: 50 }, ctx) as {
    pipelines: Array<{ name: string }>;
  };

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1.0/teamFeatures/lead-pipelines");
  assertEquals(url.searchParams.get("name"), "Act");
  assertEquals(url.searchParams.get("currPage"), "0");
  assertEquals(url.searchParams.get("pageSize"), "50");
  // Not offset/limit, which the rest of the API uses.
  assertEquals(url.searchParams.has("offset"), false);
  assertEquals(result.pipelines[0].name, "Active");
});

Deno.test("pipeline-list: currPage=0 is a value, not an absence", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({ currPage: 0 }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("currPage"), "0");
});

Deno.test("pipeline-list: the name filter is documented as a substring match", () => {
  const name = action.params!.find((p) => p.key === "name")!;
  assert(/Substring/.test(name.hint!), name.hint);
});
