import { assertEquals } from "@std/assert";
import { API, mockCtx } from "../_helpers.ts";
import action from "../../actions/space-get.ts";

Deno.test("space-get: GETs /spaces/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 4, name: "General", space_type: "basic" } }]);
  const out = await action.execute({ spaceId: 4 }, ctx);
  assertEquals(calls[0].url, `${API}/spaces/4`);
  assertEquals(out, { id: 4, name: "General", space_type: "basic" });
});

Deno.test("space-get: takes an integer id — no v2 route accepts a slug", () => {
  const p = action.params!.find((p) => p.key === "spaceId")!;
  assertEquals(p.type, "number");
  assertEquals(p.validation?.integer, true);
});
