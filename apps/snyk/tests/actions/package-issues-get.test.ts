import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/package-issues-get.ts";

const display = { orgId: "org-1" };

/** A purl contains / and @ — unencoded it would address a different endpoint. */
Deno.test("package-issues-get: percent-encodes the purl into the path", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [], links: {} } }], { display });
  await action.execute!({ purl: "pkg:npm/lodash@4.17.20" }, ctx);
  assertEquals(
    calls[0].url.split("?")[0],
    "https://api.snyk.io/rest/orgs/org-1/packages/pkg%3Anpm%2Flodash%404.17.20/issues",
  );
});

Deno.test("package-issues-get: a non-purl is caught here, not by a 404", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ purl: "lodash@4.17.20" }, ctx),
    Error,
    'must be a Package URL starting with "pkg:"',
  );
  assertEquals(calls.length, 0);
});
