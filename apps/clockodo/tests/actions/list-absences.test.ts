import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/list-absences.ts";
import { API_ROOT, exec, mockCtx } from "../_helpers.ts";

Deno.test("list-absences: GETs /v4/absences with deepObject filters", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [{ id: 1, type: 1 }] } }]);
  const out = await exec(action, {
    usersId: 4,
    year: 2026,
    type: "1",
    status: "1",
    usersActive: true,
  }, ctx);
  assertEquals(calls[0].method, "GET");
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, `${API_ROOT}/v4/absences`);
  assertEquals(url.searchParams.get("filter[users_id]"), "4");
  assertEquals(url.searchParams.get("filter[year]"), "2026");
  assertEquals(url.searchParams.get("filter[type]"), "1");
  assertEquals(url.searchParams.get("filter[status]"), "1");
  assertEquals(url.searchParams.get("filter[users_active]"), "true");
  assertEquals(out, { data: [{ id: 1, type: 1 }] });
});

Deno.test("list-absences: no filters means a bare URL; a bad body shape yields []", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  assertEquals(await exec(action, {}, ctx), { data: [] });
  assertEquals(calls[0].url, `${API_ROOT}/v4/absences`);
  await assertRejects(
    () => exec(action, { year: "20x" }, mockCtx().ctx),
    Error,
    "positive integer",
  );
});
