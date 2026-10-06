import { assertEquals } from "@std/assert";
import { dropCsvColumns } from "../../lib/csv.ts";
import { CRAWL_JOB } from "../_fixtures.ts";
import { shapeJob } from "../../lib/crawl.ts";

Deno.test("dropCsvColumns: removes the named column, keeping quoted commas, quotes and newlines", () => {
  const csv = 'a,token,b\n1,SECRET,"x, ""y""\nz"\n2,SECRET,w\n';
  assertEquals(dropCsvColumns(csv, ["token"]), 'a,b\n1,"x, ""y""\nz"\n2,w\n');
});

Deno.test("dropCsvColumns: no matching header leaves the content intact", () => {
  assertEquals(dropCsvColumns("a,b\n1,2\n", ["token"]), "a,b\n1,2\n");
});

Deno.test("shapeJob: strips token-bearing fields and derives status", () => {
  const out = shapeJob(CRAWL_JOB);
  assertEquals(JSON.stringify(out).includes("SECRETTOKEN"), false);
  assertEquals(out.finished, false);
  assertEquals(out.statusCode, 7);
});
