import { assertEquals } from "@std/assert";
import leadUpdate from "../../actions/lead-update.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("lead-update: PUT /zapier/leads/{id} encodes the id and omits it from the body", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  await leadUpdate.execute({
    leadIdOrEmailOrPhone: "a+b@x.com",
    leadStatus: "Hot",
    note: "called",
    sendRegistrationEmail: false,
  }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/zapier/leads/a%2Bb%40x.com");
  assertEquals(bodyOf(calls[0]), {
    leadStatus: "Hot",
    note: "called",
    sendRegistrationEmail: false,
  });
});
