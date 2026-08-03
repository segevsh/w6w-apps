import { assertEquals } from "@std/assert";
import formSubmissionList from "../../actions/form-submission-list.ts";
import { collection, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("form-submission-list: GETs the collection with every documented filter mapped", async () => {
  const { ctx, calls } = mockCtx([{ body: collection(["1"], "form_submissions") }]);
  await formSubmissionList.execute({
    siteId: "111",
    formId: "456",
    sort: "-created_at",
    pageSize: 20,
  }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0]), "/v1/form_submissions");
  const q = queryOf(calls[0]);
  assertEquals(q["filter[site_id]"], "111");
  assertEquals(q["filter[form_id]"], "456");
  assertEquals(q["sort"], "-created_at");
  assertEquals(q["page[size]"], "20");
});

Deno.test("form-submission-list: sends no query at all when nothing is filled in", async () => {
  const { ctx, calls } = mockCtx([{ body: collection(["1"], "form_submissions") }]);
  await formSubmissionList.execute({}, ctx);
  assertEquals(queryOf(calls[0]), {});
});
