import type { ActionDefinition } from "@w6w/types";
import { encodeSegment, SmartSuiteClient } from "../lib/client.ts";

interface Input {
  solutionId: string;
}

/**
 * `GET /solutions/{solutionId}/` — one Solution, including its structure.
 *
 * `solutionId` is the value of the `id` field returned by `list-solutions`.
 */
const getSolution: ActionDefinition<Input> = {
  key: "get-solution",
  type: "read",
  resource: "solution",
  title: "Get Solution",
  description: "Retrieve a single SmartSuite Solution by id (GET /solutions/{solutionId}/).",
  params: [
    {
      key: "solutionId",
      label: "Solution ID",
      type: "string",
      required: true,
      hint: "The `id` of a Solution, as returned by List Solutions.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Solution ID" },
    { key: "name", type: "string", label: "Solution name" },
  ],

  execute(input, ctx) {
    return new SmartSuiteClient(ctx).request(
      `solutions/${encodeSegment(input.solutionId)}/`,
    );
  },
};

export default getSolution;
