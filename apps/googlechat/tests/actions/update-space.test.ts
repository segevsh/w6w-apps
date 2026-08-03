import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-space.ts";

Deno.test("update-space: PATCHes spaces/{space} with updateMask in the query", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ space: "A1", updateMask: "display_name", displayName: "New" }, ctx);
  assertEquals(calls[0].method, "PATCH");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/spaces/A1");
  assertEquals(url.searchParams.get("updateMask"), "display_name");
  assertEquals(JSON.parse(calls[0].body!), { displayName: "New" });
});

Deno.test("update-space: nests description and guidelines under spaceDetails together", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({
    space: "spaces/A1",
    updateMask: "space_details",
    description: "d",
    guidelines: "g",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { spaceDetails: { description: "d", guidelines: "g" } });
});

Deno.test("update-space: passes a multi-path mask through verbatim", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({
    space: "A1",
    updateMask: "display_name,space_details",
    displayName: "N",
    description: "d",
  }, ctx);
  assertEquals(
    new URL(calls[0].url).searchParams.get("updateMask"),
    "display_name,space_details",
  );
});

Deno.test("update-space: sends an empty body when only the mask is given", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ space: "A1", updateMask: "display_name" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {});
});
