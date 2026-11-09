import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import trigger from "../../triggers/new-document.ts";

test("new-document declares the existing documents request and supplied descending order", () => {
  assertEquals(typeof trigger.poll, "function");
  assertEquals(
    "/v1/projects/{project}/databases/{database}/documents/{collection}?orderBy=__name__%20desc",
    "/v1/projects/{project}/databases/{database}/documents/{collection}?orderBy=__name__%20desc",
  );
});
