import { assertEquals } from "@std/assert";
import inquiryGet from "../../actions/inquiry-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("inquiry-get: GET /v2/inquiries/{conversation uuid}", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "c1" } } }]);
  await inquiryGet.execute({ uuid: "c1", include: "messages" }, ctx);
  assertEquals(calls[0].url, "https://public.api.hospitable.com/v2/inquiries/c1?include=messages");
});
