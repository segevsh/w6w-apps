import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx, outputKeys } from "../_helpers.ts";

import listSegments from "../../actions/list-segments.ts";
import getSegment from "../../actions/get-segment.ts";

test("list-segments: GET /v1/segments, paging mapped to per_page", async () => {
  const { ctx, calls } = mockCtx([{ body: { meta: {}, data: [] } }]);
  await listSegments.execute({ page: 2, perPage: 100 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/segments");
  assertEquals(url.searchParams.get("page"), "2");
  assertEquals(url.searchParams.get("per_page"), "100");
});

test("segments: the paginated lists are `search`, the single reads are `read`", () => {
  assertEquals(listSegments.type, "search");
  assertEquals(getSegment.type, "read");
  assert(outputKeys(listSegments).includes("meta"), "list must expose the envelope");
});
