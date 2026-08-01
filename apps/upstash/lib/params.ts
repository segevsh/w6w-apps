import type { OutputField, Param } from "@w6w/types";

/** The key param nearly every command takes. */
export function keyParam(hint?: string): Param {
  return { key: "key", label: "Key", type: "string", required: true, hint };
}

/**
 * Every action here returns `{ result }`, the exact shape of Upstash's REST
 * response body — the thinnest wrapper that still lets `output` describe
 * what the value means for each command.
 */
export function resultOutput(
  type: OutputField["type"],
  label: string,
): OutputField[] {
  return [{ key: "result", type, label }];
}
