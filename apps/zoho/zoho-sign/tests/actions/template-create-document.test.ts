import { assertEquals } from "@std/assert";
import { mockSignCtx } from "../_helpers.ts";
import action from "../../actions/template-create-document.ts";

Deno.test(
  "template-create-document: urlencoded POST with data= plus a sibling is_quicksend field",
  async () => {
    const { ctx, calls } = mockSignCtx([
      {
        body: {
          code: 0,
          status: "success",
          requests: { request_id: "r1", request_status: "inprogress" },
        },
      },
    ]);

    const out = await action.execute({
      templateId: "t1",
      requestName: "Partnership agreement",
      actions: [{
        action_id: "a1",
        action_type: "SIGN",
        recipient_name: "John",
        recipient_email: "j@x.com",
      }],
      isQuickSend: true,
    }, ctx);

    const call = calls[0];
    assertEquals(new URL(call.url).pathname, "/api/v1/templates/t1/createdocument");
    assertEquals(call.method, "POST");
    assertEquals(call.headers["content-type"], "application/x-www-form-urlencoded");

    const params = new URLSearchParams(call.body!);
    assertEquals(params.get("is_quicksend"), "true");
    const data = JSON.parse(params.get("data")!);
    assertEquals(data.templates.request_name, "Partnership agreement");
    assertEquals(data.templates.actions.length, 1);
    assertEquals(out, { request_id: "r1", request_status: "inprogress" });
  },
);

Deno.test("template-create-document: isQuickSend defaults to true", async () => {
  const { ctx, calls } = mockSignCtx([
    { body: { code: 0, status: "success", requests: { request_id: "r1" } } },
  ]);

  await action.execute({ templateId: "t1", actions: [] }, ctx);

  const params = new URLSearchParams(calls[0].body!);
  assertEquals(params.get("is_quicksend"), "true");
});
