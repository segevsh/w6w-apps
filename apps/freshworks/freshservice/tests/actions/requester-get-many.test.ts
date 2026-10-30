import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockFreshserviceCtx } from "../_helpers.ts";
import action from "../../actions/requester-get-many.ts";

test("requester-get-many: GETs /requesters and unwraps `requesters`", async () => {
  const { ctx, calls } = mockFreshserviceCtx([{ body: { requesters: [{ id: 1 }] } }]);
  const out = await action.execute({}, ctx);
  assertEquals(calls[0].url, "https://acme.freshservice.com/api/v2/requesters");
  assertEquals(out, { requesters: [{ id: 1 }] });
});

test("requester-get-many: maps the phone filters and include_agents", async () => {
  const { ctx, calls } = mockFreshserviceCtx([{ body: { requesters: [] } }]);
  await action.execute({
    email: "ron@hogwarts.test",
    mobilePhoneNumber: "77762443",
    workPhoneNumber: "62443",
    includeAgents: true,
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("email"), "ron@hogwarts.test");
  assertEquals(url.searchParams.get("mobile_phone_number"), "77762443");
  assertEquals(url.searchParams.get("work_phone_number"), "62443");
  assertEquals(url.searchParams.get("include_agents"), "true");
});
