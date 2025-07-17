import React from 'react';

interface Props {
  todo: TodoItem;
  onRemove: () => void;
}

const TodoItem: React.FC<Props> = ({ todo, onRemove }) => {
  return (
    <div>
      <span style={{ textDecoration: todo.completed ? 'line-through' : 'none' }}>
        {todo.text}
      </span>
      <button onClick={onRemove}>X</button>
    </div>
  );
};

export default TodoItem;