import { assertEquals } from "@std/assert";
import {
  idParam,
  includesParam,
  pageQuery,
  pageSizeParam,
  pagingParams,
} from "../../lib/params.ts";

Deno.test("pageQuery: maps startIndex to the endpoint's own parameter name", () => {
  const input = { pageSize: 5, startIndex: 10 };
  assertEquals(pageQuery(input, "recordStartIndex"), { pageSize: 5, recordStartIndex: 10 });
  assertEquals(pageQuery(input, "pageStartIndex"), { pageSize: 5, pageStartIndex: 10 });
});

Deno.test("pagingParams: pageSize + startIndex, with an optional max", () => {
  assertEquals(pagingParams().map((p) => p.key), ["pageSize", "startIndex"]);
  assertEquals(pageSizeParam(25).validation, { min: 1, max: 25, integer: true });
  assertEquals(pageSizeParam().validation, { min: 1, integer: true });
});

Deno.test("idParam / includesParam", () => {
  assertEquals(idParam("jobId", "Job id").required, true);
  assertEquals(idParam("jobId", "Job id", "h").hint, "h");
  assertEquals(includesParam("contact").hint?.includes("contact"), true);
});
