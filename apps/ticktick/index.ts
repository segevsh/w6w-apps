import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";

// project — TickTick's name for what its apps call a List
import listProjects from "./actions/list-projects.ts";
import getProject from "./actions/get-project.ts";
import getProjectData from "./actions/get-project-data.ts";
import createProject from "./actions/create-project.ts";
import updateProject from "./actions/update-project.ts";
import deleteProject from "./actions/delete-project.ts";

// task
import getTask from "./actions/get-task.ts";
import createTask from "./actions/create-task.ts";
import updateTask from "./actions/update-task.ts";
import completeTask from "./actions/complete-task.ts";
import deleteTask from "./actions/delete-task.ts";
import moveTask from "./actions/move-task.ts";
import filterTasks from "./actions/filter-tasks.ts";
import listCompletedTasks from "./actions/list-completed-tasks.ts";

// focus — pomodoro / timing sessions
import listFocuses from "./actions/list-focuses.ts";
import getFocus from "./actions/get-focus.ts";
import deleteFocus from "./actions/delete-focus.ts";

// habit
import listHabits from "./actions/list-habits.ts";
import getHabit from "./actions/get-habit.ts";
import createHabit from "./actions/create-habit.ts";
import updateHabit from "./actions/update-habit.ts";
import checkinHabit from "./actions/checkin-habit.ts";
import listHabitCheckins from "./actions/list-habit-checkins.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    listProjects,
    getProject,
    getProjectData,
    createProject,
    updateProject,
    deleteProject,
    getTask,
    createTask,
    updateTask,
    completeTask,
    deleteTask,
    moveTask,
    filterTasks,
    listCompletedTasks,
    listFocuses,
    getFocus,
    deleteFocus,
    listHabits,
    getHabit,
    createHabit,
    updateHabit,
    checkinHabit,
    listHabitCheckins,
  ],
  auth: [oauth2],
  healthChecks: [service, quota],
} satisfies AppDefinition;
