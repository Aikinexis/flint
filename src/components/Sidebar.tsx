

/**
 * Navigation item interface
 */
export interface NavigationItem {
  id: string;
  label: string;
  icon: string;
}

/**
 * Sidebar component props
 */
export interface SidebarProps {
  items: NavigationItem[];
  activeItemId: string | null;
  onNavigate: (itemId: string) => void;
}

/**
 * Render icon SVG based on icon name
 */
function renderIcon(iconName: string) {
  const iconProps = {
    width: 18,
    height: 18,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  switch (iconName) {
    case 'mic':
      return (
        <svg {...iconProps} viewBox="0 0 24 24">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
        </svg>
      );
    case 'edit':
      return (
        <svg {...iconProps} viewBox="0 0 24 24">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      );
    case 'list':
      return (
        <svg {...iconProps} viewBox="0 0 24 24">
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
      );
    case 'settings':
      return (
        <svg {...iconProps} viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24" />
        </svg>
      );
    default:
      return null;
  }
}

/**
 * Compact sidebar navigation component
 * Always shows icons only, content panels slide out when clicked
 */
export function Sidebar({ items, activeItemId, onNavigate }: SidebarProps) {
  const handleNavigate = (itemId: string) => {
    // If clicking the same item, close the panel
    if (itemId === activeItemId) {
      onNavigate('');
    } else {
      onNavigate(itemId);
    }
  };

  return (
    <div className="flint-sidebar">
      <div className="sidebar-content">
        <nav className="sidebar-nav" aria-label="Main navigation">
          {items.map((item) => (
            <button
              key={item.id}
              className={`flint-btn ${activeItemId === item.id ? 'active' : ''}`}
              onClick={() => handleNavigate(item.id)}
              aria-label={item.label}
              aria-current={activeItemId === item.id ? 'page' : undefined}
              title={item.label}
            >
              <span className="icon" aria-hidden="true">
                {renderIcon(item.icon)}
              </span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
