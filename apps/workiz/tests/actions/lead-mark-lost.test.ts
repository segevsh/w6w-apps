import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import leadMarkLost from "../../actions/lead-mark-lost.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

test("lead-mark-lost: POSTs only auth_secret to /lead/markLost/{UUID}/", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ code: "200", flag: true, msg: "ok" }] }]);
  const out = await leadMarkLost.execute({ uuid: "l1", authSecret: "sec_1" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/lead/markLost/l1/");
  assertEquals(bodyOf(calls[0]), { auth_secret: "sec_1" });
  assertEquals(out, [{ code: "200", flag: true, msg: "ok" }]);
});

/** Workiz answers a bare array here, and `flag:false` rides a 200. */
test("lead-mark-lost: a flag=false answer is returned, not thrown", async () => {
  const { ctx } = mockCtx([{ body: [{ code: "404", flag: false, msg: "lead not found" }] }]);
  const out = await leadMarkLost.execute({ uuid: "nope", authSecret: "s" }, ctx);
  assertEquals(out[0].flag, false);
  assertEquals(out[0].msg, "lead not found");
});

test("lead-mark-lost: an empty body becomes an empty array", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  assertEquals(await leadMarkLost.execute({ uuid: "l1", authSecret: "s" }, ctx), []);
});

test("lead-mark-lost: marking is idempotent, and escapes the UUID", async () => {
  assertEquals(leadMarkLost.idempotent, true);
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await leadMarkLost.execute({ uuid: "a b", authSecret: "s" }, ctx);
  assertEquals(pathOf(calls[0].url), "/lead/markLost/a%20b/");
});
