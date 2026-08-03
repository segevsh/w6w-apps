import { assertEquals } from "@std/assert";
import getLead from "../../actions/get-lead.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("get-lead: GETs /leads/{email} and always sends the mandatory version=v2", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await getLead.execute!({ email: "john.doe@example.com" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/leads/john.doe%40example.com");
  assertEquals(url.searchParams.get("version"), "v2");
});

Deno.test("get-lead: clearing version still sends v2 — lemlist rejects the request without it", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await getLead.execute!({ email: "a@b.com", version: undefined }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("version"), "v2");
});

Deno.test("get-lead: percent-encodes the email — a raw + or & would corrupt the path", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await getLead.execute!({ email: "a+tag&x@b.com" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/leads/a%2Btag%26x%40b.com");
});

Deno.test("get-lead: returns lemlist's array — one record per campaign the email is in", async () => {
  const body = [
    { _id: "lea_1", status: "review", campaign: { id: "cam_1" } },
    { _id: "lea_2", status: "running", campaign: { id: "cam_2" } },
  ];
  const { ctx } = mockCtx([{ body }]);
  assertEquals(await getLead.execute!({ email: "a@b.com" }, ctx), body);
});
