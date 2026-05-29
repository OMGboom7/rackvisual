import { useState, useRef, useEffect, ReactNode } from 'react';

type Tab = { key: string; label: string; icon: string; content: ReactNode };

export default function BottomSheet({ tabs }: { tabs: Tab[] }) {
  const [active, setActive] = useState<string>(tabs[0]?.key ?? '');
  const [expanded, setExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);

  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [active, tabs]);

  const current = tabs.find((t) => t.key === active);

  return (
    <div className="fixed bottom-16 left-0 right-0 z-20 md:hidden">
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

      {/* 展开的内容 */}
      <div
        className="overflow-hidden transition-all duration-200 bg-rack-surface/95 backdrop-blur border-t border-rack-border"
        style={{ maxHeight: expanded ? contentHeight + 24 : 0 }}
      >
        <div ref={contentRef} className="px-3 py-2 text-xs max-h-[50vh] overflow-y-auto">
          {current?.content}
        </div>
      </div>
    </div>
  );
}
