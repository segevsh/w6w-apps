import { assertEquals } from "@std/assert";
import { mockConnectedCtx, pathOf } from "../_helpers.ts";
import action from "../../actions/get-collection.ts";

const collection = {
  name: "Team",
  item_count: 1,
  customer_lock: "unlocked",
  regular_page_bindable: true,
  base_refresh_interval: "PT1H",
  fields: [
    { name: "Name", type: "TEXT" },
    { name: "Tags", type: "MULTI_SELECT", multi_select_options: ["a", "b"] },
  ],
  values: [{ id: "row-1", page_item_url: "/team/ada", data: { Name: "Ada" } }],
};

Deno.test("get-collection: GETs both path segments, encoded", async () => {
  const { ctx, calls } = mockConnectedCtx([{ body: collection }]);
  const result = await action.execute!(
    { siteName: "abc1234d", collectionName: "Team Roster" },
    ctx,
  ) as typeof collection;

  assertEquals(pathOf(calls[0].url), "/api/sites/multiscreen/abc1234d/collection/Team%20Roster");
  assertEquals(calls[0].method, "GET");
  assertEquals(result.fields[1].multi_select_options, ["a", "b"]);
});

Deno.test("get-collection: both path params are required", () => {
  for (const key of ["siteName", "collectionName"]) {
    assertEquals(action.params!.find((p) => p.key === key)?.required, true, key);
  }
});

Deno.test("get-collection: a missing collection is Duda's ResourceNotExist, not an empty body", async () => {
  const { ctx } = mockConnectedCtx([{
    status: 400,
    body: { error_code: "ResourceNotExist", message: "Collection not found" },
  }]);
  const err = await Promise.resolve(
    action.execute!({ siteName: "abc", collectionName: "nope" }, ctx),
  )
    .catch((e: Error) => e);
  assertEquals(
    (err as Error).message,
    "Duda 400 for GET /api/sites/multiscreen/abc/collection/nope: ResourceNotExist: Collection not found",
  );
});
