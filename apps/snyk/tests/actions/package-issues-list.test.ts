import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/package-issues-list.ts";

const display = { orgId: "org-1" };

Deno.test("package-issues-list: POSTs the purls inside the JSON:API envelope", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }], { display });
  await action.execute!({ purls: "pkg:npm/lodash@4.17.20, pkg:npm/express@4.17.1" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/rest/orgs/org-1/packages/issues");
  assertEquals(JSON.parse(calls[0].body!), {
    data: {
      type: "resource",
      attributes: {
        purls: [{ purl: "pkg:npm/lodash@4.17.20" }, { purl: "pkg:npm/express@4.17.1" }],
      },
    },
  });
});

Deno.test("package-issues-list: every entry must be a purl, and it names the bad ones", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ purls: "pkg:npm/a@1, lodash" }, ctx),
    Error,
    "lodash",
  );
  assertEquals(calls.length, 0);
});
