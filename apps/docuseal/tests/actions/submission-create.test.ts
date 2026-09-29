import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/submission-create.ts";

Deno.test("submission-create: sends templateId and the parsed submitters", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ id: 1, submission_id: 10 }] }]);
  await action.execute!({
    templateId: 7,
    submitters: '[{"role":"First Party","email":"a@example.com"}]',
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.docuseal.com/submissions");
  assertEquals(
    JSON.parse(calls[0].body!),
    { template_id: 7, submitters: [{ role: "First Party", email: "a@example.com" }] },
  );
});

/** The vendor's own default is `preserved`, so leaving order unset omits the field honestly. */
Deno.test("submission-create: order is only sent when it differs from the vendor default", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  await action.execute!({ templateId: 1, submitters: "[{}]", order: "random" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).order, "random");

  const { ctx: ctx2, calls: calls2 } = mockCtx([{ status: 200, body: [] }]);
  await action.execute!({ templateId: 1, submitters: "[{}]" }, ctx2);
  assertEquals("order" in JSON.parse(calls2[0].body!), false);
});

Deno.test("submission-create: at least one submitter is required", async () => {
  const { ctx, calls } = mockCtx([]);
  let threw = false;
  try {
    await action.execute!({ templateId: 1, submitters: "[]" }, ctx);
  } catch {
    threw = true;
  }
  assert(threw);
  assertEquals(calls.length, 0);
});
