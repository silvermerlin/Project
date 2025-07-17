import React from 'react';
import TodoItem from './TodoItem';

interface Props {
  todos: TodoItem[];
  removeTodo: (id: number) => void;
}

const TodoList: React.FC<Props> = ({ todos, removeTodo }) => {
  return (
    <ul>
      {todos.map((todo) => (
        <li key={todo.id}>
          <TodoItem todo={todo} onRemove={() => removeTodo(todo.id)} />
        </li>
      ))}
    </ul>
  );
};

export default TodoList;