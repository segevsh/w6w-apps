import { assertEquals } from "@std/assert";
import { API, mockCtx, pathOf, queryOf } from "../_helpers.ts";
import action from "../../actions/member-list.ts";

Deno.test("member-list: GETs /community_members with no query when nothing is set", async () => {
  const { ctx, calls } = mockCtx([{ body: { records: [] } }]);
  await action.execute({}, ctx);
  assertEquals(calls[0].url, `${API}/community_members`);
  assertEquals(calls[0].method, "GET");
});

Deno.test("member-list: forwards status and pagination", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ status: "all", page: 2, perPage: 50 }, ctx);
  assertEquals(queryOf(calls[0]), { status: ["all"], page: ["2"], per_page: ["50"] });
});

Deno.test("member-list: tag ids go out as repeated `member_tag_ids[]`, not one CSV value", async () => {
  // Rails reads the repeated form into an array; a comma-joined string arrives
  // as a single value and gets coerced to one id.
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ memberTagIds: " 7, 8 " }, ctx);
  assertEquals(queryOf(calls[0])["member_tag_ids[]"], ["7", "8"]);
  assertEquals(pathOf(calls[0]), "/api/admin/v2/community_members");
});

Deno.test("member-list: an unparseable tag field is dropped rather than sent empty", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ memberTagIds: " , " }, ctx);
  assertEquals(queryOf(calls[0]), {});
});
