import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/data-dump-create.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("data-dump-create: POSTs the documented path", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "d1" } } }]);
  const out = await action.execute!({ type: "daily", emailWhenFinished: false }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.wakatime.com/api/v1/users/current/data_dumps");
  assertEquals(calls[0].body, '{"type":"daily","email_when_finished":false}');
  assertEquals(out, { data: { id: "d1" } });
});

Deno.test("data-dump-create: a vendor error reports status and message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { errors: ["Unauthorized."] } }]);
  await assertRejects(
    async () => await action.execute!({ type: "daily", emailWhenFinished: false }, ctx),
    Error,
    "HTTP 401 — Unauthorized.",
  );
});
