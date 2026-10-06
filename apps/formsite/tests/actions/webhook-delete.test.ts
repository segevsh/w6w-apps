import { assertEquals } from "@std/assert";
import { mockFormsiteCtx } from "../_helpers.ts";
import webhookDelete from "../../actions/webhook-delete.ts";

const B = "https://fs3.formsite.com/api/v2/acme";

Deno.test("webhook-delete: DELETEs with the url as a query param", async () => {
  const { ctx, calls } = mockFormsiteCtx([{ body: {} }]);
  const out = await webhookDelete.execute({ formDir: "f1", url: "https://h/x?a=1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, B + "/forms/f1/webhooks?url=https%3A%2F%2Fh%2Fx%3Fa%3D1");
  assertEquals(out, { deleted: true });
});
