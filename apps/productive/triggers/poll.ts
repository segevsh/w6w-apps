import { pollFromListAction } from "../../_shared/poll/mod.ts";
import boardList from "../actions/board-list.ts";
import bookingList from "../actions/booking-list.ts";
import commentList from "../actions/comment-list.ts";
import companyList from "../actions/company-list.ts";
import dealStatusList from "../actions/deal-status-list.ts";
import invoiceList from "../actions/invoice-list.ts";
import pageList from "../actions/page-list.ts";
import personList from "../actions/person-list.ts";
import projectList from "../actions/project-list.ts";
import serviceList from "../actions/service-list.ts";
import taskList from "../actions/task-list.ts";
import tasklistList from "../actions/tasklist-list.ts";
import timeEntryList from "../actions/time-entry-list.ts";
import todoList from "../actions/todo-list.ts";
import webhookList from "../actions/webhook-list.ts";
import workflowStatusList from "../actions/workflow-status-list.ts";

type Result = { items?: unknown[] };

function newRecord(
  key: string,
  title: string,
  action: Parameters<typeof pollFromListAction>[0]["action"],
  input: Record<string, unknown>,
) {
  return pollFromListAction({
    key,
    title,
    description: `The run gets each newly listed ${title.replace(/^New /, "").toLowerCase()}.`,
    action,
    input: () => input,
    items: (result) => (result as Result).items ?? [],
    idOf: (item) => String((item as { id?: unknown }).id ?? ""),
    output: [{ key: "id", type: "string", label: "ID" }],
    sample: { id: "record-1" },
    maxPages: 1,
  });
}

export const newBoard = newRecord("new-board", "New Board", boardList, {
  pageSize: 200,
  pageNumber: 1,
});
export const newBooking = newRecord("new-booking", "New Booking", bookingList, {
  sort: "-started_on",
  pageSize: 100,
  pageNumber: 1,
});
export const newComment = newRecord("new-comment", "New Comment", commentList, {
  sort: "-created_at",
  pageSize: 100,
  pageNumber: 1,
});
export const newCompany = newRecord("new-company", "New Company", companyList, {
  sort: "-created_at",
  pageSize: 100,
  pageNumber: 1,
});
export const newDealStatus = newRecord("new-deal-status", "New Deal Status", dealStatusList, {
  sort: "-created_at",
  pageSize: 100,
  pageNumber: 1,
});
export const newInvoice = newRecord("new-invoice", "New Invoice", invoiceList, {
  sort: "-created_at",
  pageSize: 100,
  pageNumber: 1,
});
export const newPage = newRecord("new-page", "New Docs Page", pageList, {
  sort: "-edited_at",
  pageSize: 100,
  pageNumber: 1,
});
export const newPerson = newRecord("new-person", "New Person", personList, {
  sort: "-joined_at",
  pageSize: 100,
  pageNumber: 1,
});
export const newProject = newRecord("new-project", "New Project", projectList, {
  sort: "-created_at",
  pageSize: 100,
  pageNumber: 1,
});
export const newService = newRecord("new-service", "New Service", serviceList, {
  sort: "-name",
  pageSize: 100,
  pageNumber: 1,
});
export const newTask = newRecord("new-task", "New Task", taskList, {
  sort: "-created_at",
  pageSize: 100,
  pageNumber: 1,
});
export const newTasklist = newRecord("new-tasklist", "New Task List", tasklistList, {
  sort: "-project_name",
  pageSize: 100,
  pageNumber: 1,
});
export const newTimeEntry = newRecord("new-time-entry", "New Time Entry", timeEntryList, {
  sort: "-date",
  pageSize: 100,
  pageNumber: 1,
});
export const newTodo = newRecord("new-todo", "New To-do", todoList, {
  pageSize: 200,
  pageNumber: 1,
});
export const newWebhook = newRecord("new-webhook", "New Webhook", webhookList, {
  pageSize: 200,
  pageNumber: 1,
});
export const newWorkflowStatus = newRecord(
  "new-workflow-status",
  "New Workflow Status",
  workflowStatusList,
  { sort: "-name", pageSize: 100, pageNumber: 1 },
);

export const pollTriggers = [
  newBoard,
  newBooking,
  newComment,
  newCompany,
  newDealStatus,
  newInvoice,
  newPage,
  newPerson,
  newProject,
  newService,
  newTask,
  newTasklist,
  newTimeEntry,
  newTodo,
  newWebhook,
  newWorkflowStatus,
];
