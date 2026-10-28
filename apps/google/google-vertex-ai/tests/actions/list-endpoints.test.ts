import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import listEndpoints from "../../actions/list-endpoints.ts";

const display = { projectId: "p1", location: "us-central1" };

Deno.test("list-endpoints: returnAll follows nextPageToken", async () => {
  const { ctx, calls } = mockCtx([
    { body: { endpoints: [{ name: "a" }], nextPageToken: "t" } },
    { body: { endpoints: [{ name: "b" }] } },
  ], { display });
  const out = await listEndpoints.execute!({ returnAll: true }, ctx);
  assertEquals((out as { items: unknown[] }).items.length, 2);
  assert(calls[1].url.includes("pageToken=t"));
  assert(new URL(calls[0].url).pathname.endsWith("/locations/us-central1/endpoints"));
});

Deno.test("list-endpoints: an overridden location goes to that region's host", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display });
  await listEndpoints.execute!({ location: "asia-southeast1" }, ctx);
  assert(
    calls[0].url.startsWith(
      "https://asia-southeast1-aiplatform.googleapis.com/v1/projects/p1/locations/asia-southeast1/endpoints",
    ),
  );
});
