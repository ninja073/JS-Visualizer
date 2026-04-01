import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { tokens } from '../../theme/tokens';
import { queueItemVariants } from '../../animations/variants';
import type { QueuedTask } from '../../engine';

interface QueueItemProps {
  item: QueuedTask;
  accentColor: string;
}

export function QueueItem({ item, accentColor }: QueueItemProps) {
  return (
    <motion.div
      variants={queueItemVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      layout
      style={{
        padding: '7px 12px',
        background: tokens.colors.bg.surface,
        borderRadius: 8,
        border: `1px solid ${accentColor}20`,
        borderLeft: `3px solid ${accentColor}`,
        fontSize: 12,
        fontFamily: tokens.font.code,
        color: tokens.colors.text.primary,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
    >
      {item.label}
    </motion.div>
  );
}
