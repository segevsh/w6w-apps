import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/project-list.ts";

const display = { organizationSlug: "acme" };

Deno.test("project-list: lists the org's projects", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ slug: "backend" }] }], { display });
  const result = await action.execute!({ query: "back" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/0/organizations/acme/projects/");
  assertEquals(url.searchParams.get("query"), "back");
  assertEquals(result, [{ slug: "backend" }]);
});

Deno.test("project-list: returnAll follows every cursor", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: [{ slug: "a" }],
      headers: { link: '<https://x/?cursor=c2>; rel="next"; results="true"; cursor="c2"' },
    },
    { status: 200, body: [{ slug: "b" }], headers: { link: 'rel="next"; results="false"' } },
  ], { display });
  assertEquals(await action.execute!({ returnAll: true }, ctx), [{ slug: "a" }, { slug: "b" }]);
  assertEquals(new URL(calls[1].url).searchParams.get("cursor"), "c2");
});
