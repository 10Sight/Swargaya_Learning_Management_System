import React from 'react';
import { cn } from '@/lib/utils';

const TabNavigation = ({ tabs, activeTab, onTabChange, className }) => {
  return (
    <div className={cn("border-b border-[#e5e7eb] mb-6", className)}>
      <nav className="-mb-px flex space-x-8" aria-label="Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors duration-200",
              activeTab === tab.id
                ? "border-[#3b82f6] text-[#2563eb]"
                : "border-transparent text-[#6b7280] hover:text-[#374151] hover:border-[#d1d5db]"
            )}
          >
            <div className="flex items-center gap-2">
              {tab.icon && <tab.icon className="w-4 h-4" />}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={cn(
                  "inline-flex items-center justify-center px-2 py-1 text-xs font-bold rounded-full",
                  activeTab === tab.id
                    ? "bg-[#dbeafe] text-[#1e40af]"
                    : "bg-[#f3f4f6] text-[#1f2937]"
                )}>
                  {tab.count}
                </span>
              )}
            </div>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default TabNavigation;
