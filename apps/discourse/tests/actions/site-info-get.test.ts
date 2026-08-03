import { assertEquals } from "@std/assert";
import { mockDiscourseCtx, SITE_URL } from "../_helpers.ts";
import action from "../../actions/site-info-get.ts";

Deno.test("site-info-get: GETs /site.json and returns it whole", async () => {
  const body = {
    categories: [{ id: 1 }],
    trust_levels: { newuser: 0 },
    post_action_types: [{ id: 2, name_key: "like" }],
  };
  const { ctx, calls } = mockDiscourseCtx([{ body }]);
  const out = await action.execute({}, ctx);
  // NOT /site/basic-info.json — that is the health check's tiny, login-exempt
  // sibling. This is the full guardian-scoped payload.
  assertEquals(calls[0].url, `${SITE_URL}/site.json`);
  assertEquals(out, body);
});

Deno.test("site-info-get: takes no parameters", () => {
  assertEquals(action.params, []);
});
