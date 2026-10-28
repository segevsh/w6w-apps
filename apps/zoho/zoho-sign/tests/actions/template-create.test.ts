import { assert, assertEquals } from "@std/assert";
import { mockSignCtx } from "../_helpers.ts";
import action from "../../actions/template-create.ts";

Deno.test("template-create: multipart POST to /templates with a data part and a file part", async () => {
  const { ctx, calls } = mockSignCtx(
    [
      {
        body: {
          code: 0,
          status: "success",
          templates: { template_id: "t1", template_name: "NDA" },
        },
      },
    ],
    "sign.zoho.com",
    true,
  );

  const out = await action.execute({
    templateName: "NDA",
    file: "file-ref-1",
    actions: [{ action_type: "SIGN", role: "Signer 1" }],
  }, ctx);

  const call = calls[0];
  assertEquals(new URL(call.url).pathname, "/api/v1/templates");
  assertEquals(call.method, "POST");
  assert(call.headers["content-type"]?.startsWith("multipart/form-data; boundary="));
  assert(call.body!.includes('"template_name":"NDA"'));
  assertEquals(out, { template_id: "t1", template_name: "NDA" });
});
