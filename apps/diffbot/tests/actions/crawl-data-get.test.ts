import { assert, assertEquals } from "@std/assert";
import action from "../../actions/crawl-data-get.ts";
import { mockCtx, run } from "../_helpers.ts";

const RECORDS = [
  {
    col: "c",
    pageUrl: "https://e.com/",
    id: 1,
    type: "other",
    title: "Example",
    token: "SECRETTOKEN",
  },
  { col: "c", pageUrl: "https://e.com/2", id: 2, type: "article", token: "SECRETTOKEN" },
];

Deno.test("crawl-data-get: reads /v3/crawl/data and strips the token from every record", async () => {
  const { ctx, calls } = mockCtx([{ body: RECORDS }]);
  const out = await run(action, { name: "test-crawl", num: 2 }, ctx);
  const u = new URL(calls[0].url);
  assertEquals(u.pathname, "/v3/crawl/data");
  assertEquals(u.searchParams.get("name"), "test-crawl");
  assertEquals(u.searchParams.get("num"), "2");
  assertEquals(u.searchParams.has("format"), false);
  assertEquals(out.count, 2);
  assert(!JSON.stringify(out).includes("SECRETTOKEN"));
  assertEquals((out.records as Array<{ title?: string }>)[0].title, "Example");
});

Deno.test("crawl-data-get: CSV comes back as text with the token column removed", async () => {
  const csv = 'pageUrl,token,title\nhttps://e.com/,SECRETTOKEN,"Hello, world"\n';
  const { ctx, calls } = mockCtx([{ headers: { "content-type": "text/csv" }, body: csv }]);
  const out = await run(action, { name: "n", format: "csv" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("format"), "csv");
  assertEquals(out.csv, 'pageUrl,title\nhttps://e.com/,"Hello, world"\n');
  assertEquals(out.records, []);
});

Deno.test("crawl-data-get: the URL report type is requested; an empty body is no records", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: undefined }]);
  const out = await run(action, { name: "n", type: "urls" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("type"), "urls");
  assertEquals(out.count, 0);
  assertEquals(out.csv, undefined);
});
