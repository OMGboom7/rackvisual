import { useState, useMemo, ReactNode } from 'react';

type Tab = { key: string; label: string; icon: string; content: ReactNode };

const TAB_BAR_HEIGHT = 56; // px - 约等于 tab bar 高度

export default function BottomSheet({ tabs }: { tabs: Tab[] }) {
  const [active, setActive] = useState<string>(tabs[0]?.key ?? '');
  const [expanded, setExpanded] = useState(false);

  const current = tabs.find((t) => t.key === active);

  const contentMaxHeight = useMemo(
    () => (expanded ? `calc(100vh - ${TAB_BAR_HEIGHT}px)` : '0px'),
    [expanded]
  );

  return (
    <div className="fixed bottom-0 left-0 right-0 z-20 md:hidden">
      {/* 展开的内容 */}
      <div
        className="overflow-y-auto bg-rack-surface/95 backdrop-blur border-t border-rack-border transition-all duration-200"
        style={{ maxHeight: contentMaxHeight }}
      >
        <div className="px-3 py-2 text-xs">
          {current?.content}
        </div>
      </div>

      {/* 标签栏 */}
      <div className="flex bg-rack-surface/95 backdrop-blur border-t border-rack-border">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              if (active === tab.key) setExpanded(!expanded);
              else { setActive(tab.key); setExpanded(true); }
            }}
            className={`flex-1 flex flex-col items-center py-2 text-xs transition-colors ${
              active === tab.key && expanded
                ? 'text-blue-300 bg-blue-900/30'
                : 'text-rack-muted hover:text-rack-text'
            }`}
          >
            <span className="text-base mb-0.5">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
