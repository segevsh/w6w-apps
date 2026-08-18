import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/issue-get.ts";

const conn = { display: { baseUrl: "https://git.example.com", owner: "acme" } };

/** The path takes the #number, not the internal id — both are in the response. */
Deno.test("issue-get: reads by issue number", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { number: 7, id: 4021 } }], conn);
  const result = await action.execute!({ repo: "web", issueNumber: 7 }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(calls[0].url, "https://git.example.com/api/v1/repos/acme/web/issues/7");
  assertEquals(result.number, 7);
});

Deno.test("issue-get: the output warns which id the API paths take", () => {
  const outputs = action.output as Array<{ key: string; label: string }>;
  assert(outputs.find((o) => o.key === "id")!.label.includes("not what the API paths take"));
  // A PR is an issue with this field set.
  assert(outputs.find((o) => o.key === "pull_request")!.label.includes("IS a pull request"));
});

Deno.test("issue-get: a missing number fails before any request", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ repo: "web" }, ctx),
    Error,
    "`issueNumber`",
  );
  assertEquals(calls.length, 0);
});
