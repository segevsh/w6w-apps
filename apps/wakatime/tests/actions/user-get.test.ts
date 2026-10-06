import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/user-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("user-get: GETs the documented path", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "u1", username: "ann" } } }]);
  const out = await action.execute!({}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.wakatime.com/api/v1/users/current");
  assertEquals(out, { data: { id: "u1", username: "ann" } });
});

Deno.test("user-get: a vendor error reports status and message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { errors: ["Unauthorized."] } }]);
  await assertRejects(
    async () => await action.execute!({}, ctx),
    Error,
    "HTTP 401 — Unauthorized.",
  );
});
