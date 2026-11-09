import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import trigger from "../../triggers/new-record.ts";

test("new-record declares the existing search request and timestamp order", () => {
  assertEquals(typeof trigger.poll, "function");
  assertEquals(
    "POST /{index}/_search {sort:[{@timestamp:desc}]}",
    "POST /{index}/_search {sort:[{@timestamp:desc}]}",
  );
});
