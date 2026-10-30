import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import action from "../../actions/insight-get.ts";
import { mockCtx } from "../_helpers.ts";

test("insight-get: GETs the documented path", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { languages: [] } } }]);
  const out = await action.execute!({ insightType: "languages", range: "last_30_days" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://api.wakatime.com/api/v1/users/current/insights/languages/last_30_days",
  );
  assertEquals(out, { data: { languages: [] } });
});

test("insight-get: a vendor error reports status and message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { errors: ["Unauthorized."] } }]);
  await assertRejects(
    async () => await action.execute!({ insightType: "languages", range: "last_30_days" }, ctx),
    Error,
    "HTTP 401 — Unauthorized.",
  );
});
