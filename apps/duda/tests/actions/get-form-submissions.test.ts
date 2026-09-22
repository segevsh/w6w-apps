import { assert, assertEquals } from "@std/assert";
import { mockConnectedCtx, pathOf, queryOf } from "../_helpers.ts";
import action from "../../actions/get-form-submissions.ts";

const submissions = [
  { date: "2026-09-20T10:00:00", form_title: "Contact us", message: "Hi", utm_campaign: "fall" },
];

Deno.test("get-form-submissions: GETs get-forms/{siteName} and returns the bare array", async () => {
  const { ctx, calls } = mockConnectedCtx([{ body: submissions }]);
  const result = await action.execute!({ siteName: "abc1234d" }, ctx) as typeof submissions;

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/sites/multiscreen/get-forms/abc1234d");
  assertEquals(result.length, 1);
  assertEquals(result[0].form_title, "Contact us");
});

Deno.test("get-form-submissions: passes from, to and utm_campaign through as query params", async () => {
  const { ctx, calls } = mockConnectedCtx([{ body: submissions }]);
  await action.execute!({
    siteName: "abc",
    from: "2026-09-01",
    to: "2026-09-30",
    utmCampaign: "fall",
  }, ctx);
  assertEquals(queryOf(calls[0].url), {
    from: "2026-09-01",
    to: "2026-09-30",
    utm_campaign: "fall",
  });
});

Deno.test("get-form-submissions: omitting `from` sends no filter at all", async () => {
  const { ctx, calls } = mockConnectedCtx([{ body: [] }]);
  await action.execute!({ siteName: "abc" }, ctx);
  assertEquals(queryOf(calls[0].url), {});
});

/**
 * Duda's own note: without `from`, *every* submission the site has ever
 * collected comes back. The hint is the only place a user can learn that.
 */
Deno.test("get-form-submissions: the `from` hint warns that it filters nothing", () => {
  const from = action.params!.find((p) => p.key === "from");
  assert(/every form submission/i.test(from!.hint!), from!.hint);
  assertEquals(from!.required, undefined);
});

Deno.test("get-form-submissions: the description names Duda's 300/minute limit", () => {
  assert(/300 calls\/minute/.test(action.description!), action.description);
});
