import { assertEquals } from "@std/assert";
import action from "../../actions/team-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("team-get: GETs /teams on the EU host with the bare key signed elsewhere", async () => {
  const { ctx, calls } = mockCtx([{ body: { team_id: 7, name: "Acme" } }]);
  const out = await action.execute!({}, ctx);
  assertEquals(calls[0].url, "https://public-api.ringover.com/v2/teams");
  assertEquals(calls[0].method, "GET");
  assertEquals("authorization" in calls[0].headers, false);
  assertEquals(out, { team_id: 7, name: "Acme" });
});
