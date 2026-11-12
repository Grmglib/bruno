import React from 'react';

// Shown under an expanded group that has no collections yet.
const GroupEmptyRow = () => {
  return (
    <div className="empty-folder-hint text-xs text-muted px-2 py-2" style={{ pointerEvents: 'none' }}>
      Drop collections here or use Manage collections
    </div>
  );
};

export default React.memo(GroupEmptyRow);
