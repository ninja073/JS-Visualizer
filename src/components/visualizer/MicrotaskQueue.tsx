import React from 'react';
import { AnimatePresence } from 'motion/react';
import { PanelContainer } from '../layout/PanelContainer';
import { QueueItem } from './QueueItem';
import { tokens } from '../../theme/tokens';
import type { QueuedTask } from '../../engine';

interface MicrotaskQueueProps {
  tasks: QueuedTask[];
}

export function MicrotaskQueue({ tasks }: MicrotaskQueueProps) {
  return (
    <PanelContainer
      title="Microtask Queue"
      accentColor={tokens.colors.accent.microtask}
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
              <QueueItem key={task.id} item={task} accentColor={tokens.colors.accent.microtask} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </PanelContainer>
  );
}
