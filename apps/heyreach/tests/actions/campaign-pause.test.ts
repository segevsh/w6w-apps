import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/campaign-pause.ts";

Deno.test("campaign-pause: POSTs the campaign id and returns the status only", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  const result = await action.execute!({ campaignId: 5 }, ctx);
  assertEquals(calls[0].url, "https://api.heyreach.io/api/public/campaign/Pause?campaignId=5");
  assertEquals(calls[0].method, "POST");
  assertEquals(result, { status: 200 });
});

/** The document declares a stray campaign-list body here; it is not returned. */
Deno.test("campaign-pause: a body offered by the API is ignored", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { totalCount: "2", items: [{ id: "5" }] } }]);
  assertEquals(await action.execute!({ campaignId: 5 }, ctx), { status: 200 });
});
