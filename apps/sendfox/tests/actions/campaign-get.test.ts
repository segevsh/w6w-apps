import { assertEquals } from "@std/assert";
import campaignGet from "../../actions/campaign-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("campaign-get: GETs /campaigns/{id} and returns the bare entity", async () => {
  const { ctx, calls } = mockCtx([
    { body: { id: 7, title: "August", sent_at: null, scheduled_at: null } },
  ]);
  const out = await campaignGet.execute({ id: 7 }, ctx) as { title: string };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/campaigns/7");
  assertEquals(out.title, "August");
});
