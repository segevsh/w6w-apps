import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import findSubscribersByName from "../../actions/find-subscribers-by-name.ts";

Deno.test("find-subscribers-by-name: puts name on the query string", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success", data: [] } }]);
  await findSubscribersByName.execute!({ name: "Ada Lovelace" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/fb/subscriber/findByName");
  assertEquals(url.searchParams.get("name"), "Ada Lovelace");
});

Deno.test("find-subscribers-by-name: sends no pagination — the endpoint publishes none", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success", data: [] } }]);
  await findSubscribersByName.execute!({ name: "x" }, ctx);
  const params = [...new URL(calls[0].url).searchParams.keys()];
  assertEquals(params, ["name"]);
  assertEquals((findSubscribersByName.params ?? []).map((p) => p.key), ["name"]);
});

Deno.test("find-subscribers-by-name: is a search, and returns an array", async () => {
  assertEquals(findSubscribersByName.type, "search");
  const { ctx } = mockCtx([
    { body: { status: "success", data: [{ id: "1" }, { id: "2" }] } },
  ]);
  const out = await findSubscribersByName.execute!({ name: "x" }, ctx) as { data: unknown[] };
  assertEquals(out.data.length, 2);
});

Deno.test("find-subscribers-by-name: the 100-result cap is stated where a user will see it", () => {
  assert(findSubscribersByName.description!.includes("100"), findSubscribersByName.description);
});
