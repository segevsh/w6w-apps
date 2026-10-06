import { assertEquals } from "@std/assert";
import { mockFormsiteCtx } from "../_helpers.ts";
import webhookList from "../../actions/webhook-list.ts";

const B = "https://fs3.formsite.com/api/v2/acme";

Deno.test("webhook-list: GETs /webhooks", async () => {
  const { ctx, calls } = mockFormsiteCtx([{ body: { webhooks: [{ url: "https://h" }] } }]);
  const out = await webhookList.execute({ formDir: "f1" }, ctx);
  assertEquals(calls[0].url, B + "/forms/f1/webhooks");
  assertEquals(out, { webhooks: [{ url: "https://h" }] });
});
