import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/send-bulk-email.ts";
import { exec, mockCtx, pathOf } from "../_helpers.ts";

const emails = [
  { from: { email: "a@x.com" }, to: [{ email: "p@x.com" }], subject: "1", text: "t" },
  { from: { email: "a@x.com" }, to: [{ email: "q@x.com" }], subject: "2", text: "t" },
];

Deno.test("send-bulk-email: POSTs the array as the whole body and returns the bulk id", async () => {
  const { ctx, calls } = mockCtx([{
    status: 202,
    body: {
      message: "The bulk email is being processed.",
      bulk_email_id: "614470d1588b866d0454f3e2",
    },
  }]);
  const out = await exec(action, { emails }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/bulk-email");
  assertEquals(JSON.parse(calls[0].body!), emails);
  assertEquals(out, {
    bulkEmailId: "614470d1588b866d0454f3e2",
    message: "The bulk email is being processed.",
  });
});

Deno.test("send-bulk-email: refuses an empty or non-array body before calling the API", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(() => exec(action, { emails: [] }, ctx), Error, "non-empty array");
  await assertRejects(() => exec(action, { emails: "x" }, ctx), Error, "non-empty array");
  assertEquals(calls.length, 0);
});

Deno.test("send-bulk-email: a plan error (MS40306) is surfaced", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: { message: "Your plan doesn't allow to send bulk emails. #MS40306" },
  }]);
  const err = await assertRejects(() => exec(action, { emails }, ctx));
  assert(String(err).includes("#MS40306"));
});

Deno.test("send-bulk-email: is non-idempotent", () => {
  assertEquals(action.idempotent, false);
});
