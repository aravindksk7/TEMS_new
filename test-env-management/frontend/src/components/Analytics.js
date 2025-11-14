'use client';

import { BarChart3 } from 'lucide-react';

export default function Analytics({ user }) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Analytics & Reporting</h2>
      <div className="bg-white p-12 rounded-lg shadow-sm border text-center">
        <BarChart3 className="h-16 w-16 mx-auto text-gray-400 mb-4" />
        <p className="text-gray-600">Analytics dashboard with comprehensive reports and insights</p>
      </div>
    </div>
  );
}
