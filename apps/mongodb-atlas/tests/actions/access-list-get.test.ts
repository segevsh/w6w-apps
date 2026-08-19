import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/access-list-get.ts";

const page = {
  status: 200,
  body: {
    results: [
      { cidrBlock: "203.0.113.0/24", comment: "office" },
      { ipAddress: "198.51.100.7", comment: "ci", deleteAfterDate: "2026-09-01T00:00:00Z" },
    ],
    totalCount: 2,
  },
};

Deno.test("access-list-get: reads the project's access list", async () => {
  const { ctx, calls } = mockCtx([page]);
  const result = await action.execute({ projectId: "5f8d0d55b54eff0f2b2c3d4e" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(
    new URL(calls[0].url).pathname,
    "/api/atlas/v2/groups/5f8d0d55b54eff0f2b2c3d4e/accessList",
  );
  assertEquals(result.values, ["203.0.113.0/24", "198.51.100.7"]);
  assertEquals(result.count, 2);
});

/** An entry that removes the perimeter does not stand out in a list. */
Deno.test("access-list-get: flags 0.0.0.0/0 explicitly and warns", async () => {
  const { ctx, logs } = mockCtx([{
    status: 200,
    body: {
      results: [
        { cidrBlock: "203.0.113.0/24" },
        { cidrBlock: "0.0.0.0/0", comment: "temporary, honest" },
      ],
    },
  }]);
  const result = await action.execute({ projectId: "5f8d0d55b54eff0f2b2c3d4e" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(result.openToInternet, true);
  assertEquals(logs[0].level, "warn");
  assert(/reachable from anywhere/.test(logs[0].message), logs[0].message);
});

Deno.test("access-list-get: a list without it does not warn", async () => {
  const { ctx, logs } = mockCtx([page]);
  const result = await action.execute({ projectId: "5f8d0d55b54eff0f2b2c3d4e" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(result.openToInternet, false);
  assertEquals(logs.length, 0);
});

/** Expiry is how temporary access is granted, and how it is lost. */
Deno.test("access-list-get: counts the entries that will disappear on their own", async () => {
  const { ctx } = mockCtx([page]);
  const result = await action.execute({ projectId: "5f8d0d55b54eff0f2b2c3d4e" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(result.expiringCount, 1);
});

Deno.test("access-list-get: an AWS security group entry is carried through", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { results: [{ awsSecurityGroup: "sg-0123456789abcdef0" }] },
  }]);
  const result = await action.execute({ projectId: "5f8d0d55b54eff0f2b2c3d4e" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(result.values, ["sg-0123456789abcdef0"]);
});

/** A correct password from an unlisted address gets a timeout, not a refusal. */
Deno.test("access-list-get: says this is the perimeter for every cluster", () => {
  assert(/perimeter for every cluster/.test(action.description!), action.description);
});
