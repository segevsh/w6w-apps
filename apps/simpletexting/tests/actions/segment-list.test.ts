import { assertEquals } from "@std/assert";
import segmentList from "../../actions/segment-list.ts";
import { API_ROOT, mockCtx, page, queryOf } from "../_helpers.ts";

const SEGMENT = { segmentId: "507f191e810c19729de860ea", name: "VIP customers" };

Deno.test("segment-list: reads the segments page and returns its rows", async () => {
  const { ctx, calls } = mockCtx([{ body: page([SEGMENT], { totalElements: 1 }) }]);
  const result = await segmentList.execute({}, ctx) as { content: unknown[] };

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, `${API_ROOT}/api/contact-segments`);
  assertEquals(result.content, [SEGMENT]);
});

Deno.test("segment-list: forwards page and size verbatim", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);
  await segmentList.execute({ page: 0, size: 100 }, ctx);
  assertEquals(queryOf(calls[0].url), { page: "0", size: "100" });
});

Deno.test("segment-list: is read-only — the document exposes no write endpoint for segments", () => {
  assertEquals(segmentList.type, "search");
  assertEquals(segmentList.resource, "segment");
});
