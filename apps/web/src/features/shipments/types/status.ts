import React from 'react';

export type JobStatus = 'missing-bl' | 'pending' | 'ready';

export interface StatusConfig {
  type: JobStatus;
  badgeLabel: string;
  badgeClass: string;
  icon: React.ComponentType<{ className?: string }>;
  actionLabel: string;
  actionClass: string;
  isWriteAction: boolean;
  actionIcon: React.ComponentType<{ className?: string }>;
}
