import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-profile.ts";

test("get-profile: GETs /profiles/{id}/ and forwards optional params", async () => {
  const body = { data: { type: "profile", id: "p1" } };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!(
    { profileId: "p1", additionalFields: "predictive_analytics", include: "lists" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/profiles/p1/");
  assertEquals(url.searchParams.get("additional-fields[profile]"), "predictive_analytics");
  assertEquals(url.searchParams.get("include"), "lists");
  assertEquals(result, body);
});
