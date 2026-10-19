import { assertEquals, assertExists } from "@std/assert";
import app from "../index.ts";
import coverage from "../docs/endpoint-coverage.json" with { type: "json" };

Deno.test("catalog covers every public and Admin OpenAPI operation without duplicate action keys", () => {
  assertEquals(new Set(app.actions.map((action) => action.key)).size, app.actions.length);
  assertEquals(coverage.length, 107);
  for (const endpoint of coverage) assertExists(app.actions.find((a) => a.key === endpoint.action));
  const originalKeys = [
    "get-database",
    "list-databases",
    "search-databases",
    "get-many-databases",
    "create-database-page",
    "get-database-page",
    "get-many-database-pages",
    "update-database-page",
    "create-page",
    "search-pages",
    "archive-page",
    "restore-page",
    "append-block-children",
    "get-block",
    "get-many-blocks",
    "get-user",
    "get-many-users",
  ];
  for (const key of originalKeys) assertExists(app.actions.find((a) => a.key === key));
});

import { testContract } from "./_contracts.ts";

testContract("get-block");
testContract("get-database");
testContract("get-many-blocks");
testContract("get-many-users");
testContract("get-user");
