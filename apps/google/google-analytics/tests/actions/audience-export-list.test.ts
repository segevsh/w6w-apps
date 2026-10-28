import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/audience-export-list.ts";

const display = { propertyId: "123" };

Deno.test("audience-export-list: pages the Data API host with pageToken", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: { audienceExports: [{ name: "x/1", state: "ACTIVE" }], nextPageToken: "t2" },
    },
    { status: 200, body: { audienceExports: [{ name: "x/2", state: "CREATING" }] } },
  ], { display });
  const result = await action.execute!({ returnAll: true }, ctx);
  // Data API host, Admin-style paging.
  assertEquals(
    calls[0].url.startsWith(
      "https://analyticsdata.googleapis.com/v1beta/properties/123/audienceExports",
    ),
    true,
    calls[0].url,
  );
  assertEquals(new URL(calls[1].url).searchParams.get("pageToken"), "t2");
  assertEquals(result, [{ name: "x/1", state: "ACTIVE" }, { name: "x/2", state: "CREATING" }]);
});

Deno.test("audience-export-list: a limit truncates the collected rows", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { audienceExports: [{ name: "x/1" }, { name: "x/2" }] },
  }], { display });
  assertEquals(await action.execute!({ limit: 1 }, ctx), [{ name: "x/1" }]);
});
