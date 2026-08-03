import { assertEquals } from "@std/assert";
import { envelope, mockCtx } from "../_helpers.ts";
import action from "../../actions/user-get-usage.ts";

Deno.test("user-get-usage: GETs /user/usage and folds limit-left into the result", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: envelope(
        { submissions: "478", uploads: "31246868", api: "14" },
        { "limit-left": 4986 },
      ),
    },
  ]);
  const result = await action.execute({}, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/user/usage");
  assertEquals(result, {
    submissions: "478",
    uploads: "31246868",
    api: "14",
    limitLeft: 4986,
  });
});

Deno.test("user-get-usage: an absent limit-left leaves the field undefined", async () => {
  const { ctx } = mockCtx([{ body: envelope({ api: "3" }) }]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.limitLeft, undefined);
});
