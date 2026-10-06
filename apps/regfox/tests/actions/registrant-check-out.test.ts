import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/registrant-check-out.ts";
import { envelope, exec, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("registrant-check-out: by id posts a numeric id and the date", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 17492, date: "2026-05-02T22:32:22Z" }) }]);
  const out = await exec(action, { id: "17492", date: "2026-05-02T22:32:22Z" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/public/registrant/check-out");
  assertEquals(JSON.parse(calls[0].body!), { id: 17492, date: "2026-05-02T22:32:22Z" });
  assertEquals(out, { id: 17492, date: "2026-05-02T22:32:22Z" });
  assertEquals(action.idempotent, false);
});

Deno.test("registrant-check-out: by display id sends displayId and no date", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ displayId: "01BP" }) }]);
  await exec(action, { displayId: "01BP" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { displayId: "01BP" });
});

Deno.test("registrant-check-out: both or neither identifier is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  const err1 = await assertRejects(() => exec(action, { id: "1", displayId: "x" }, ctx));
  assert((err1 as Error).message.includes("exactly one"));
  await assertRejects(() => exec(action, {}, ctx));
  assertEquals(calls.length, 0);
});
