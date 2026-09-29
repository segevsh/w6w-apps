import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockSignCtx } from "../_helpers.ts";
import action from "../../actions/request-create.ts";

Deno.test("request-create: multipart POST to /requests with a data part and a file part", async () => {
  const { ctx, calls } = mockSignCtx(
    [
      {
        body: {
          code: 0,
          status: "success",
          requests: { request_id: "14197000000767334", request_status: "draft" },
        },
      },
    ],
    "sign.zoho.com",
    true,
  );

  const out = await action.execute({
    requestName: "NDA",
    file: "file-ref-1",
    actions: [{ action_type: "SIGN", recipient_name: "Alex", recipient_email: "a@b.com" }],
    isSequential: true,
  }, ctx);

  assertEquals(calls.length, 1);
  const call = calls[0];
  assertEquals(new URL(call.url).pathname, "/api/v1/requests");
  assertEquals(call.method, "POST");
  assert(call.headers["content-type"]?.startsWith("multipart/form-data; boundary="));
  assert(call.body!.includes('Content-Disposition: form-data; name="data"'));
  assert(
    call.body!.includes('Content-Disposition: form-data; name="file"; filename="document.pdf"'),
  );
  assert(call.body!.includes('"request_name":"NDA"'));
  assert(call.body!.includes('"is_sequential":true'));
  assertEquals(out, { request_id: "14197000000767334", request_status: "draft" });
});

Deno.test("request-create: throws when the host provides no ctx.file", async () => {
  const { ctx } = mockSignCtx([], "sign.zoho.com", false);
  await assertRejects(
    async () => await action.execute({ requestName: "NDA", file: "x", actions: [] }, ctx),
    Error,
    "ctx.file",
  );
});
