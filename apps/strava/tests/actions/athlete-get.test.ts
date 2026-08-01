import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/athlete-get.ts";

Deno.test("athlete-get: GETs the authenticated athlete", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, firstname: "Marianne" } }]);
  assertEquals(await action.execute({}, ctx), { id: 1, firstname: "Marianne" });
  assertEquals(calls[0].url, "https://www.strava.com/api/v3/athlete");
  assertEquals(calls[0].method, "GET");
});
