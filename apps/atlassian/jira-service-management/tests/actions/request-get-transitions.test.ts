import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockJsmCtx } from "../_helpers.ts";
import action from "../../actions/request-get-transitions.ts";

test("request-get-transitions: GETs the available transitions", async () => {
  const { ctx, calls } = mockJsmCtx([{ body: { values: [{ id: "1", name: "Resolve" }] } }]);
  const out = await action.execute({ issueIdOrKey: "HD-1" }, ctx);
  assertEquals(
    calls[0].url,
    "https://acme.atlassian.net/rest/servicedeskapi/request/HD-1/transition?start=0&limit=50",
  );
  assertEquals(out, { values: [{ id: "1", name: "Resolve" }] });
});
