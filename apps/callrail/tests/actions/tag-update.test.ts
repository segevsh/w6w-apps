import { assertEquals } from "@std/assert";
import tagUpdate from "../../actions/tag-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("tag-update: PUTs name/color/disabled to the tag's own id", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "1", name: "Renamed", status: "disabled" } }]);
  const out = await tagUpdate.execute(
    { accountId: "ACC1", tagId: "1", name: "Renamed", disabled: true },
    ctx,
  );
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v3/a/ACC1/tags/1.json");
  assertEquals(JSON.parse(calls[0].body!), { name: "Renamed", disabled: true });
  assertEquals(out, { id: "1", name: "Renamed", status: "disabled" });
});
