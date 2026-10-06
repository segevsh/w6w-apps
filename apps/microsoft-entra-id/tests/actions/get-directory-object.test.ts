import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-directory-object.ts";

Deno.test("get-directory-object: GETs /directoryObjects/{id} and returns the typed object", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "@odata.type": "#microsoft.graph.group", id: "g1", displayName: "Sales" },
  }]);
  const out = await action.execute({ objectId: "g1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/directoryObjects/g1");
  assertEquals(out["@odata.type"], "#microsoft.graph.group");
});

Deno.test("get-directory-object: sends no query parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ objectId: "x" }, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});
