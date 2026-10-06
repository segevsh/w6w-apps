import type { ActionDefinition } from "@w6w/types";
import { TalentLmsClient } from "../lib/client.ts";

interface Input {
  testId: number;
  userId: number;
}

const testGetAnswers: ActionDefinition<Input> = {
  key: "test-get-answers",
  type: "read",
  resource: "unit",
  title: "Get Test Answers",
  description: "A user's answers in a test.",
  params: [
    { key: "testId", label: "Test ID", type: "number", required: true },
    { key: "userId", label: "User ID", type: "number", required: true },
  ],

  execute(input, ctx) {
    return new TalentLmsClient(ctx).get("gettestanswers", {
      test_id: input.testId,
      user_id: input.userId,
    });
  },
};

export default testGetAnswers;
