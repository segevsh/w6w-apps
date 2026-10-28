import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/board-update.ts";

Deno.test("board-update: PUTs only the fields that were supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "b1" } }]);
  await action.execute({ id: "b1", name: "Renamed" }, ctx);
  assertEquals(calls[0].method, "PUT");
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("name"), "Renamed");
  assertEquals([...q.keys()], ["name"]);
});

Deno.test("board-update: nests the visibility pref under prefs/permissionLevel", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ id: "b1", prefsPermissionLevel: "public" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("prefs/permissionLevel"), "public");
});

Deno.test("board-update: sends closed:false rather than dropping it", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ id: "b1", closed: false }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("closed"), "false");
});
