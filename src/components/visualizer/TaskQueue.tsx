import React from 'react';
import { AnimatePresence } from 'motion/react';
import { PanelContainer } from '../layout/PanelContainer';
import { QueueItem } from './QueueItem';
import { tokens } from '../../theme/tokens';
import type { QueuedTask } from '../../engine';

interface TaskQueueProps {
  tasks: QueuedTask[];
}

export function TaskQueue({ tasks }: TaskQueueProps) {
  return (
    <PanelContainer
      title="Task Queue"
      accentColor={tokens.colors.accent.taskQueue}
      count={tasks.length}
    >
      {tasks.length === 0 ? (
        <div style={{
          color: tokens.colors.text.muted,
          fontSize: 12,
          fontStyle: 'italic',
          textAlign: 'center',
          padding: '14px 0',
        }}>
          Empty
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <AnimatePresence mode="popLayout">
            {tasks.map((task) => (
              <QueueItem key={task.id} item={task} accentColor={tokens.colors.accent.taskQueue} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </PanelContainer>
  );
}
