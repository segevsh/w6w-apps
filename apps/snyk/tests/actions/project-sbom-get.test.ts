import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/project-sbom-get.ts";

const display = { orgId: "org-1" };

Deno.test("project-sbom-get: sends the required format", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { bomFormat: "CycloneDX" } }], { display });
  await action.execute!({ projectId: "p1", format: "cyclonedx1.6+json" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/rest/orgs/org-1/projects/p1/sbom");
  assertEquals(url.searchParams.get("format"), "cyclonedx1.6+json");
});

/** Snyk has no default format — CycloneDX and SPDX are different documents. */
Deno.test("project-sbom-get: a blank format is refused rather than guessed", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ projectId: "p1", format: "" }, ctx),
    Error,
    "no default SBOM format",
  );
  assertEquals(calls.length, 0);
});
