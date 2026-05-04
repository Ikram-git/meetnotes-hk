import { TasksClient } from './tasks-client';

export const metadata = { title: 'Tasks — Briva' };
export const dynamic = 'force-dynamic';

export default function TasksPage() {
  return <TasksClient />;
}
