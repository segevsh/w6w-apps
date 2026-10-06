import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/get-project-design-tokens.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("get-project-design-tokens: GETs /projects/5db81e73e1e36ee19f138c1a/design_tokens and returns the vendor object", async () => {
  const doc = { id: "x", name: "N" };
  const { ctx, calls } = mockCtx([{ body: doc }]);
  assertEquals(
    await action.execute({
      projectId: "5db81e73e1e36ee19f138c1a",
      tokenNameCase: "camel",
      includeLinkedStyleguides: true,
    }, ctx),
    doc,
  );
  const u = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    u.origin + u.pathname,
    "https://api.zeplin.dev/v1/projects/5db81e73e1e36ee19f138c1a/design_tokens",
  );
  assertEquals(u.searchParams.get("token_name_case"), "camel");
  assertEquals(u.searchParams.get("include_linked_styleguides"), "true");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("get-project-design-tokens: a 404 is thrown with the vendor message and a membership hint", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { message: "Not Found" } }]);
  await assertRejects(
    async () =>
      await action.execute({
        projectId: "5db81e73e1e36ee19f138c1a",
        tokenNameCase: "camel",
        includeLinkedStyleguides: true,
      }, ctx),
    Error,
    "Not Found",
  );
});

Deno.test("get-project-design-tokens: a missing projectId is refused before any request", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () =>
      await action.execute({
        ...{
          projectId: "5db81e73e1e36ee19f138c1a",
          tokenNameCase: "camel",
          includeLinkedStyleguides: true,
        },
        projectId: " ",
      }, ctx),
    Error,
    "is required",
  );
  assertEquals(calls.length, 0);
});
