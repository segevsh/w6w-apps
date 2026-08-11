import { assertEquals } from "@std/assert";
import action from "../../actions/team-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("team-list: GETs /v2/teams", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: "t-1" }], "cur") }]);
  const out = await action.execute({}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/teams");
  assertEquals(out.nextPageCursor, "cur");
});

Deno.test("team-list: name, handle and query are three separate filters", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await action.execute({ name: "Platform", handle: "platform", query: "plat" }, ctx);
  assertEquals(queryOf(calls[0].url), {
    name: "Platform",
    handle: "platform",
    query: "plat",
  });
});
