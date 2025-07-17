import React, { useState } from 'react';

interface Props {
  filter?: string;
  setFilter?: (filter: string) => void;
}

const TodoFilter: React.FC<Props> = ({ filter, setFilter }) => {
  const [selectedFilter, setSelectedFilter] = useState<string | undefined>(filter);

  const handleFilterChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedFilter(event.target.value);
    if (setFilter) {
      setFilter(event.target.value);
    }
  };

  return (
    <div>
      <select value={selectedFilter} onChange={handleFilterChange}>
        <option value="all">All</option>
        <option value="completed">Completed</option>
        <option value="pending">Pending</option>
      </select>
    </div>
  );
};

export default TodoFilter;