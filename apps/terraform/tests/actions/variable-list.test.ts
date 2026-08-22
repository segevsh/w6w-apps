import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/variable-list.ts";

const vars = {
  status: 200,
  body: {
    data: [
      {
        id: "var-1",
        attributes: { key: "region", value: "eu-west-1", category: "terraform", sensitive: false },
      },
      {
        id: "var-2",
        attributes: { key: "AWS_SECRET_ACCESS_KEY", value: null, category: "env", sensitive: true },
      },
      {
        id: "var-3",
        attributes: { key: "TF_LOG", value: "INFO", category: "env", sensitive: false },
      },
    ],
  },
};

Deno.test("variable-list: reads a workspace's variables", async () => {
  const { ctx, calls } = mockCtx([vars]);
  const result = await action.execute({ workspaceId: "ws-1" }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://app.terraform.io/api/v2/workspaces/ws-1/vars");
  assertEquals(result.count, 3);
  assertEquals(result.keys, ["region", "AWS_SECRET_ACCESS_KEY", "TF_LOG"]);
});

/** Read-modify-write across a workspace blanks every sensitive variable. */
Deno.test("variable-list: reports how many values are unreadable", async () => {
  const { ctx, logs } = mockCtx([vars]);
  const result = await action.execute({ workspaceId: "ws-1" }, ctx) as Record<string, unknown>;
  assertEquals(result.sensitiveCount, 1);
  assertEquals(logs[0].data, { workspaceId: "ws-1", count: 3, sensitiveCount: 1 });
  assert(/unreadable forever/.test(action.description!), action.description);
});

/** Provider credentials live in `env`; a `terraform` one is ignored silently. */
Deno.test("variable-list: counts and filters by category", async () => {
  const { ctx } = mockCtx([vars]);
  const all = await action.execute({ workspaceId: "ws-1" }, ctx) as Record<string, unknown>;
  assertEquals(all.envCount, 2);

  const env = mockCtx([vars]);
  const filtered = await action.execute(
    { workspaceId: "ws-1", category: "env" },
    env.ctx,
  ) as Record<string, unknown>;
  assertEquals(filtered.count, 2);
  assertEquals(filtered.keys, ["AWS_SECRET_ACCESS_KEY", "TF_LOG"]);

  const terraform = mockCtx([vars]);
  const inputs = await action.execute(
    { workspaceId: "ws-1", category: "terraform" },
    terraform.ctx,
  ) as Record<string, unknown>;
  assertEquals(inputs.keys, ["region"]);
});

/** The category filter is applied here; the API returns both. */
Deno.test("variable-list: filtering does not change the request", async () => {
  const { ctx, calls } = mockCtx([vars]);
  await action.execute({ workspaceId: "ws-1", category: "env" }, ctx);
  assertEquals(calls[0].url, "https://app.terraform.io/api/v2/workspaces/ws-1/vars");
});

Deno.test("variable-list: a workspace with no variables is not an error", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { data: [] } }]);
  const result = await action.execute({ workspaceId: "ws-1" }, ctx) as Record<string, unknown>;
  assertEquals(result.count, 0);
  assertEquals(result.sensitiveCount, 0);
});

Deno.test("variable-list: the sensitive value comes back as null, and is left as it is", async () => {
  const { ctx } = mockCtx([vars]);
  const result = await action.execute({ workspaceId: "ws-1" }, ctx) as Record<string, unknown>;
  const secret = (result.variables as Array<Record<string, unknown>>)
    .find((entry) => entry["key"] === "AWS_SECRET_ACCESS_KEY")!;
  assertEquals(secret["value"], null);
  assertEquals(secret["sensitive"], true);
});
