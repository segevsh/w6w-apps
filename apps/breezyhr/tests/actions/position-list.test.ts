import { assertEquals } from "@std/assert";
import action from "../../actions/position-list.ts";
import { mockCtx } from "../_helpers.ts";

type Rec = Record<string, unknown>;

Deno.test("position-list: unpaged sends only the state", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ _id: "p1" }] }]);
  const out = await action.execute!({ companyId: "c1", state: "published", page: 3 }, ctx);
  assertEquals(calls[0].url, "https://api.breezy.hr/v3/company/c1/positions?state=published");
  assertEquals(out, { positions: [{ _id: "p1" }] });
});

Deno.test("position-list: a full page reports the next page", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ _id: "a" }, { _id: "b" }] }]);
  const out = await action.execute!({ companyId: "c1", pageSize: 2, page: 2 }, ctx);
  assertEquals(calls[0].url, "https://api.breezy.hr/v3/company/c1/positions?page_size=2&page=2");
  assertEquals((out as Rec).nextPage, 3);
});

Deno.test("position-list: a short page has no next page", async () => {
  const { ctx } = mockCtx([{ body: [{ _id: "a" }] }]);
  const out = await action.execute!({ companyId: "c1", pageSize: 2 }, ctx);
  assertEquals("nextPage" in (out as Rec), false);
});
