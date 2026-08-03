import { assertEquals } from "@std/assert";
import { API, mockCtx, queryOf } from "../_helpers.ts";
import action from "../../actions/member-tag-list.ts";

Deno.test("member-tag-list: GETs /member_tags", async () => {
  const { ctx, calls } = mockCtx([{ body: { records: [] } }]);
  await action.execute({}, ctx);
  assertEquals(calls[0].url, `${API}/member_tags`);
});

Deno.test("member-tag-list: is_public is tri-state — unset means both", async () => {
  const unset = mockCtx([{ body: {} }]);
  await action.execute({}, unset.ctx);
  assertEquals(queryOf(unset.calls[0]).is_public, undefined);

  const privateOnly = mockCtx([{ body: {} }]);
  await action.execute({ isPublic: false }, privateOnly.ctx);
  assertEquals(queryOf(privateOnly.calls[0]).is_public, ["false"]);

  const publicOnly = mockCtx([{ body: {} }]);
  await action.execute({ isPublic: true }, publicOnly.ctx);
  assertEquals(queryOf(publicOnly.calls[0]).is_public, ["true"]);
});

Deno.test("member-tag-list: forwards name, sort and pagination", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ name: "VIP", sort: "alphabetical", page: 1, perPage: 20 }, ctx);
  assertEquals(queryOf(calls[0]), {
    name: ["VIP"],
    sort: ["alphabetical"],
    page: ["1"],
    per_page: ["20"],
  });
});
