import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx, pathOf } from "../_helpers.ts";
import getEnquiry from "../../actions/get-enquiry.ts";

test("get-enquiry: GET /v1/reservation/enquiry/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 2 } }]);
  await getEnquiry.execute({ enquiryId: 2 }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/reservation/enquiry/2");
});
