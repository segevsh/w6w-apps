import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/member-list.ts";

const display = { organizationSlug: "acme" };

Deno.test("member-list: lists the org's members", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ id: "1", email: "a@b.com" }] }], {
    display,
  });
  const result = await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/0/organizations/acme/members/");
  assertEquals(result, [{ id: "1", email: "a@b.com" }]);
});

Deno.test("member-list: returnAll collects every page", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: [{ id: "1" }],
      headers: { link: '<https://x/?cursor=c2>; rel="next"; results="true"; cursor="c2"' },
    },
    { status: 200, body: [{ id: "2" }], headers: { link: 'rel="next"; results="false"' } },
  ], { display });
  assertEquals(await action.execute!({ returnAll: true }, ctx), [{ id: "1" }, { id: "2" }]);
  assertEquals(calls.length, 2);
});
