import React, { useState } from 'react';
import TodoList from './TodoList';
import TodoItem from './TodoItem';
import TodoFilter from './TodoFilter';

const TodoApp: React.FC = () => {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [filter, setFilter] = useState<string | undefined>();

  const addTodo = () => {
    if (inputValue.trim()) {
      const newTodo: TodoItem = {
        id: Date.now(),
        text: inputValue,
        completed: false
      };
      setTodos([...todos, newTodo]);
      setInputValue('');
    }
  };

  const removeTodo = (id: number) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  return (
    <div className="todo-app">
      <h1>Todo App</h1>
      <div>
        <input 
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Add new todo"
        />
        <button onClick={addTodo}>Add</button>
      </div>
      {filter && (
        <TodoFilter filter={filter} setFilter={setFilter} />
      )}
      <TodoList todos={todos.filter(todo => !filter || (todo.completed && filter === 'completed') || (!todo.completed && filter === 'pending'))} removeTodo={removeTodo} />
    </div>
  );
};

export default TodoApp;