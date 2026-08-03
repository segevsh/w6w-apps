import { assertEquals } from "@std/assert";
import listCampaigns from "../../actions/list-campaigns.ts";
import { mockCtx, optionValues } from "../_helpers.ts";

Deno.test("list-campaigns: GETs /campaigns and defaults version to v2", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await listCampaigns.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.origin + url.pathname, "https://api.lemlist.com/api/campaigns");
  assertEquals(url.searchParams.get("version"), "v2");
  assertEquals([...url.searchParams.keys()], ["version"], "no other defaults are invented");
});

Deno.test("list-campaigns: forwards every documented filter, page and sort param", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await listCampaigns.execute!({
    status: "running",
    createdBy: "usr_QG9E94KvTmC7KWqzs",
    offset: 24,
    limit: 2,
    page: 1,
    sortBy: "createdAt",
    sortOrder: "desc",
  }, ctx);
  const p = new URL(calls[0].url).searchParams;
  assertEquals(p.get("status"), "running");
  assertEquals(p.get("createdBy"), "usr_QG9E94KvTmC7KWqzs");
  assertEquals(p.get("offset"), "24");
  assertEquals(p.get("limit"), "2");
  assertEquals(p.get("page"), "1");
  assertEquals(p.get("sortBy"), "createdAt");
  assertEquals(p.get("sortOrder"), "desc");
});

Deno.test("list-campaigns: offers exactly lemlist's status enum", () => {
  assertEquals(
    [...optionValues(listCampaigns, "status")].sort(),
    ["archived", "draft", "ended", "errors", "paused", "running"],
  );
});

Deno.test("list-campaigns: is a search action returning the bare array lemlist sends", async () => {
  assertEquals(listCampaigns.type, "search");
  const body = [{ _id: "cam_1", name: "Product Launch", status: "running" }];
  const { ctx } = mockCtx([{ body }]);
  assertEquals(await listCampaigns.execute!({}, ctx), body);
});
