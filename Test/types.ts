export interface TodoItem {
  id: number;
  text: string;
  completed: boolean;
}

export interface TodoList {
  todos: TodoItem[];
  filter?: 'all' | 'completed' | 'pending';
}

export type FilterType = 'all' | 'completed' | 'pending';

export interface TodoAppProps {
  todos: TodoItem[];
  setTodos: (todos: TodoItem[]) => void;
  filter?: FilterType;
  setFilter?: (filter: FilterType) => void;
}