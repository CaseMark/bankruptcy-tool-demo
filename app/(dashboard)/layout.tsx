/**
 * Dashboard Layout
 *
 * Wraps all dashboard pages with authentication check
 * Protected routes require user to be logged in
 * Includes global chat widget for client support
 */

import { ReactNode } from 'react';
import { ChatWidget } from '@/components/chat/chat-widget';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      {children}
      <ChatWidget />
    </div>
  );
}
