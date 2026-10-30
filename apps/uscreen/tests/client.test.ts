import { test } from "node:test";
import { assertEquals, assertThrows } from "./_assert.ts";
import { csv, csvInts, errorText, nextPageFromLink, seg } from "../lib/client.ts";

test("client.nextPageFromLink: picks the next relation only", () => {
  const link = '<https://uscreen.io/publisher_api/v1/customers?page=2>; rel="next", ' +
    '<https://uscreen.io/publisher_api/v1/customers?page=9>; rel="last"';
  assertEquals(nextPageFromLink(link), 2);
  assertEquals(nextPageFromLink('<https://x/y?page=1>; rel="prev"'), null);
  assertEquals(nextPageFromLink(null), null);
});

test("client.errorText: reads both error shapes", () => {
  assertEquals(errorText({ message: "Not Found" }), "Not Found");
  assertEquals(
    errorText({ email: ["has already been taken"], password: ["is too short"] }),
    "email has already been taken; password is too short",
  );
  assertEquals(errorText([1]), undefined);
});

test("client: seg encodes emails; csv helpers trim and validate", () => {
  assertEquals(seg(" a+b@c.co "), "a%2Bb%40c.co");
  assertEquals(csv("a, b\n c,"), ["a", "b", "c"]);
  assertEquals(csvInts("1, 2"), [1, 2]);
  assertThrows(() => csvInts("1,x"), Error, "whole-number");
});
