import { assert, assertEquals } from "@std/assert";
import { mockConnectedCtx, page, pathOf, queryOf, US } from "../_helpers.ts";
import action from "../../actions/list-sites.ts";

Deno.test("list-sites: GETs /api/sites/multiscreen on the recorded region's host", async () => {
  const { ctx, calls } = mockConnectedCtx([{ body: page([{ site_name: "abc" }]) }]);
  const result = await action.execute!({ limit: 10, offset: 5 }, ctx) as {
    results: unknown[];
  };
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, `${US}/api/sites/multiscreen?limit=10&offset=5`);
  assertEquals(result.results.length, 1);
});

Deno.test("list-sites: defaults are omitted, so Duda applies its own", async () => {
  const { ctx, calls } = mockConnectedCtx([{ body: page([]) }]);
  await action.execute!({}, ctx);
  assertEquals(queryOf(calls[0].url), {});
});

Deno.test("list-sites: a publish-status list reaches the wire as csv", async () => {
  const { ctx, calls } = mockConnectedCtx([{ body: page([]) }]);
  await action.execute!({ publishStatus: "PUBLISHED,UNPUBLISHED" }, ctx);
  assertEquals(queryOf(calls[0].url).publish_status, "PUBLISHED,UNPUBLISHED");
});

Deno.test("list-sites: sort and direction are documented enums", () => {
  const sort = action.params!.find((p) => p.key === "sort");
  const direction = action.params!.find((p) => p.key === "direction");
  assertEquals(sort?.default, "CREATION_DATE");
  assertEquals(
    (sort?.options as Array<{ value: string }>).map((o) => o.value),
    ["CREATION_DATE", "LAST_PUBLISHED_DATE"],
  );
  // Listed default-first (DESC) for the UI; both documented enum values are present.
  assertEquals(
    (direction?.options as Array<{ value: string }>).map((o) => o.value).sort(),
    ["ASC", "DESC"],
  );
  assertEquals(action.params!.find((p) => p.key === "limit")?.default, 75);
});

Deno.test("list-sites: never sets an authorization header itself", async () => {
  const { ctx, calls } = mockConnectedCtx([{ body: page([]) }]);
  await action.execute!({}, ctx);
  assertEquals(calls[0].headers["authorization"], undefined);
  // The vendor's docs require a user-agent; Deno's fetch sends none of its own.
  assert(calls[0].headers["user-agent"]?.startsWith("w6w-duda/"), calls[0].headers["user-agent"]);
});

Deno.test("list-sites: surfaces Duda's own error_code and message", async () => {
  const { ctx } = mockConnectedCtx([{
    status: 400,
    body: { error_code: "InvalidInput", message: "limit must be between 1 and 200" },
  }]);
  const err = await Promise.resolve(action.execute!({}, ctx)).catch((e: Error) => e);
  assert(err instanceof Error);
  assert(err.message.includes("InvalidInput"), err.message);
  assert(err.message.includes("limit must be between 1 and 200"), err.message);
  assert(err.message.includes(pathOf(`${US}/api/sites/multiscreen`)), err.message);
});
