import { assertEquals } from "@std/assert";
import action from "../../actions/team-get.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("team-get: GETs the team by id", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "t-1", fields: { name: "Platform" } }) }]);
  const out = await action.execute({ teamId: "t-1" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/teams/t-1");
  assertEquals(out.data, { id: "t-1", fields: { name: "Platform" } });
});

Deno.test("team-get: makes exactly one request — members are a separate call", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "t-1" }) }]);
  await action.execute({ teamId: "t-1" }, ctx);
  assertEquals(calls.length, 1);
});
