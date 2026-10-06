import type { ActionDefinition } from "@w6w/types";
import { peopleGet } from "../lib/people.ts";
import { employeeRef, resultOutput } from "../lib/params.ts";

interface Input {
  userId: string;
}

const holidaysGet: ActionDefinition<Input> = {
  key: "holidays-get",
  type: "read",
  resource: "leave",
  title: "Get Holidays",
  description: "Get the holidays that apply to an employee.",
  params: [employeeRef],
  output: resultOutput,

  async execute(input, ctx) {
    if (!input.userId) throw new Error("`userId` is required.");
    return await peopleGet(ctx, "/leave/getHolidays", { userId: input.userId });
  },
};

export default holidaysGet;
