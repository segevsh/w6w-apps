import { memberAction } from "../lib/factory.ts";

export default memberAction({
  key: "task-mark-complete",
  title: "Mark Task Complete",
  noun: "Task",
  type: "task",
  path: "tasks",
  action: "markComplete",
  description: "Mark a task complete, optionally attaching a note to its prospect.",
  actionParams: ["completionNote", "completionAction"],
  params: [
    {
      key: "completionNote",
      label: "Completion note",
      type: "text",
      hint: "Attached as a note to the task's prospect, if it has one.",
    },
    {
      key: "completionAction",
      label: "Sequence completion",
      type: "select",
      hint:
        "Only for sequence-step tasks: how to finish the sequence state. Blank advances the sequence.",
      options: [
        { value: "finish_no_reply", label: "Finish the sequence (no reply)" },
        { value: "finish_replied", label: "Finish the sequence (replied)" },
      ],
    },
  ],
});
