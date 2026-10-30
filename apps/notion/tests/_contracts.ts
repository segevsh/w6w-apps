import { test } from "node:test";
import { assertEquals, assertExists } from "./_assert.ts";
import type { ActionDefinition } from "@w6w/types";
import app from "../index.ts";
import contracts from "./fixtures/contracts.json" with { type: "json" };
import { mockCtx } from "./_helpers.ts";

/** Each action's transport is checked against the downloaded OpenAPI contract fixture. */
export function testContract(key: string): void {
  const contract = contracts.find((c) => c.action === key);
  assertExists(contract, `Missing OpenAPI contract: ${key}`);
  test(`OpenAPI transport contract: ${key}`, async () => {
    const action = app.actions.find((a) => a.key === contract.action) as ActionDefinition;
    assertExists(action);
    const response = { id: "result", results: [], has_more: true, next_cursor: "next" };
    const { ctx, calls } = mockCtx([{ body: response }]);
    assertEquals(await action.execute(contract.input, ctx), response);
    assertEquals(calls.length, 1);
    const call = calls[0];
    const url = new URL(call.url);
    assertEquals(url.origin, "https://api.notion.com");
    assertEquals(decodeURIComponent(url.pathname), contract.path);
    assertEquals(call.method, contract.method);
    assertEquals(call.headers["notion-version"], contract.version);
    const expectedQuery = contract.query as Record<string, unknown>;
    for (const [key, value] of Object.entries(expectedQuery)) {
      assertEquals(
        url.searchParams.getAll(key),
        (Array.isArray(value) ? value : [value]).map(String),
      );
    }
    assertEquals(
      [...url.searchParams.keys()].sort(),
      Object.entries(expectedQuery).flatMap(([key, value]) =>
        (Array.isArray(value) ? value : [value]).map(() => key)
      ).sort(),
    );
    assertEquals(call.body === null ? null : JSON.parse(call.body), contract.body);
  });
}
