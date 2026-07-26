import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/board-create.ts";

Deno.test("board-create: POSTs /boards with the name in the query", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "b1", name: "Roadmap" } }]);
  const out = await action.execute({ name: "Roadmap" }, ctx);
  assertEquals(out, { id: "b1", name: "Roadmap" });
  assertEquals(calls[0].method, "POST");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/1/boards");
  assertEquals(url.searchParams.get("name"), "Roadmap");
});

Deno.test("board-create: maps the prefs params onto Trello's prefs_ names", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute(
    { name: "R", prefsPermissionLevel: "org", prefsBackground: "blue", defaultLists: false },
    ctx,
  );
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("prefs_permissionLevel"), "org");
  assertEquals(q.get("prefs_background"), "blue");
  assertEquals(q.get("defaultLists"), "false");
});

Deno.test("board-create: is a non-idempotent perform", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
});
