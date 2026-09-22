import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/lead-get.ts";

const lead = { leadId: 651095960136641, firstName: "Bob", emails: ["bob@example.com"] };

Deno.test("lead-get: fetches one lead and passes withTrash", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: lead }]);
  const result = await action.execute!({ leadId: 651095960136641, withTrash: true }, ctx);
  assertEquals(calls[0].url, "https://api.lofty.com/v1.0/leads/651095960136641?withTrash=true");
  assertEquals(result, lead);
});

/** The description says wrapped; the schema says flat. Both are accepted. */
Deno.test("lead-get: unwraps a `lead` envelope when present", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { lead } }]);
  assertEquals(await action.execute!({ leadId: 1 }, ctx), lead);
});

Deno.test("lead-get: withTrash defaults to absent, not to false", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: lead }]);
  await action.execute!({ leadId: 1 }, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});
