import { assertEquals } from "@std/assert";
import leadActivate from "../../actions/lead-activate.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("lead-activate: POSTs only auth_secret to /lead/activate/{UUID}/", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ code: "200", flag: true, msg: "activated" }] }]);
  const out = await leadActivate.execute({ uuid: "l9", authSecret: "sec_9" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/lead/activate/l9/");
  assertEquals(bodyOf(calls[0]), { auth_secret: "sec_9" });
  assertEquals(out.length, 1);
});

Deno.test("lead-activate: the vendor's verdict lives in the body, not the status", async () => {
  const { ctx } = mockCtx([{ body: [{ code: "400", flag: false, msg: "cannot activate" }] }]);
  const out = await leadActivate.execute({ uuid: "l9", authSecret: "s" }, ctx);
  assertEquals(out[0], { code: "400", flag: false, msg: "cannot activate" });
});

Deno.test("lead-activate: activating is idempotent", () => {
  assertEquals(leadActivate.idempotent, true);
  assertEquals(leadActivate.key, "lead-activate");
});
