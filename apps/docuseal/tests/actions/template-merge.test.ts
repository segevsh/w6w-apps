import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/template-merge.ts";

Deno.test("template-merge: sends the parsed template ids", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 3, name: "Merged" } }]);
  await action.execute!({ templateIds: "[321,432]", name: "Merged" }, ctx);
  assertEquals(calls[0].url, "https://api.docuseal.com/templates/merge");
  assertEquals(JSON.parse(calls[0].body!), { template_ids: [321, 432], name: "Merged" });
  assertEquals(action.idempotent, false);
});

Deno.test("template-merge: templateIds is required", async () => {
  const { ctx, calls } = mockCtx([]);
  let threw = false;
  try {
    await action.execute!({}, ctx);
  } catch {
    threw = true;
  }
  assert(threw);
  assertEquals(calls.length, 0);
});
