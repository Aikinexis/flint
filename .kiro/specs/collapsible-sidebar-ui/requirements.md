# Requirements Document

## Introduction

This specification defines the requirements for redesigning the Flint Chrome Extension's side panel UI from a horizontal tab-based layout to a modern collapsible sidebar navigation pattern. The sidebar will provide a more scalable navigation structure while maintaining full compatibility with Flint's existing OKLCH design tokens and supporting both light and dark themes.

## Glossary

- **Flint Panel**: The Chrome extension side panel UI that hosts all user-facing features
- **Sidebar**: A vertical navigation component positioned on the left edge of the panel
- **Collapsed State**: A compact sidebar mode showing only icons (72px width)
- **Expanded State**: A full sidebar mode showing icons and labels (240px width)
- **Navigation Items**: Clickable buttons within the sidebar that switch between different feature views
- **Design Tokens**: CSS custom properties defined in tokens.css that control colors, spacing, and typography
- **OKLCH**: A perceptual color space used for all Flint color definitions

## Requirements

### Requirement 1

**User Story:** As a Flint user, I want a collapsible sidebar navigation so that I can maximize content space while maintaining easy access to all features

#### Acceptance Criteria

1. THE Flint Panel SHALL render a fixed-position sidebar on the left edge with a default width of 240px
2. WHEN the user clicks the toggle button, THE Flint Panel SHALL animate the sidebar width to 72px within 250 milliseconds
3. WHEN the sidebar is in collapsed state, THE Flint Panel SHALL display only navigation icons without text labels
4. WHEN the sidebar is in expanded state, THE Flint Panel SHALL display navigation icons with corresponding text labels
5. THE Flint Panel SHALL persist the sidebar state (collapsed or expanded) using chrome.storage.local across browser sessions

### Requirement 2

**User Story:** As a Flint user, I want the sidebar to use familiar design patterns so that navigation feels intuitive and consistent with other modern applications

#### Acceptance Criteria

1. THE Sidebar SHALL position a toggle button at the top with a hamburger icon (☰) that spans the full toolbar height
2. WHERE the sidebar is expanded, THE Sidebar SHALL display a search input field below the toggle button with full width
3. WHEN the sidebar transitions to collapsed state, THE Sidebar SHALL fade out the search field to opacity 0 within 200 milliseconds
4. THE Sidebar SHALL organize navigation items in a vertical list with 8px gap between items
5. WHEN a navigation item is clicked, THE Flint Panel SHALL highlight the active item with the primary color background

### Requirement 3

**User Story:** As a Flint user, I want the sidebar to seamlessly integrate with the existing design system so that the UI feels cohesive and polished

#### Acceptance Criteria

1. THE Sidebar SHALL use var(--surface) for background color to match the existing panel background
2. THE Sidebar SHALL apply var(--border-muted) for the right border with 1px width
3. THE Sidebar SHALL use var(--shadow-soft) for the box shadow effect
4. THE Sidebar SHALL apply var(--radius-md) for navigation button border radius
5. THE Sidebar SHALL use existing Flint typography tokens (--fs-lg for toggle, --fs-sm for labels)

### Requirement 4

**User Story:** As a Flint user, I want smooth visual transitions when collapsing or expanding the sidebar so that the interface feels responsive and polished

#### Acceptance Criteria

1. WHEN the sidebar state changes, THE Sidebar SHALL animate the width property with a 250ms ease timing function
2. WHEN the sidebar state changes, THE Sidebar SHALL animate background colors with a 250ms ease timing function
3. WHEN navigation buttons receive hover interaction, THE Sidebar SHALL apply var(--surface-2) background within 150 milliseconds
4. WHEN the toggle button receives hover interaction, THE Sidebar SHALL apply var(--surface-2) background within 200 milliseconds
5. THE Sidebar SHALL maintain smooth transitions in both light and dark theme modes

### Requirement 5

**User Story:** As a Flint user, I want the sidebar navigation to support all existing panel features so that I can access Voice, Rewrite, Summary, and Settings views

#### Acceptance Criteria

1. THE Sidebar SHALL render four navigation items: Home (🏠), Projects (📁), Analytics (📊), and Settings (⚙️)
2. WHEN a navigation item is clicked, THE Flint Panel SHALL render the corresponding feature component in the main content area
3. THE Sidebar SHALL map navigation items to existing components: Home→Voice, Projects→Rewrite, Analytics→Summary, Settings→Settings
4. WHEN the sidebar is collapsed, THE Sidebar SHALL center-align icons within the 72px width
5. THE Sidebar SHALL maintain the active state indicator when switching between collapsed and expanded modes

### Requirement 6

**User Story:** As a Flint user, I want the sidebar to be accessible via keyboard and screen readers so that navigation is inclusive for all users

#### Acceptance Criteria

1. THE Sidebar toggle button SHALL include aria-label="Toggle sidebar" for screen reader support
2. WHEN the toggle button receives keyboard focus, THE Sidebar SHALL display the focus ring using var(--shadow-focus)
3. THE Sidebar navigation buttons SHALL be keyboard navigable using Tab and Shift+Tab keys
4. WHEN a navigation button receives keyboard focus, THE Sidebar SHALL display the focus ring using var(--shadow-focus)
5. THE Sidebar SHALL support Enter and Space key activation for all interactive elements

### Requirement 7

**User Story:** As a Flint developer, I want the sidebar implementation to follow React best practices so that the code is maintainable and testable

#### Acceptance Criteria

1. THE Sidebar SHALL be implemented as a functional React component with TypeScript strict mode compliance
2. THE Sidebar SHALL use React hooks (useState) to manage collapsed state locally
3. THE Sidebar SHALL use useEffect to persist sidebar state to chrome.storage.local on state changes
4. THE Sidebar SHALL accept navigation items as props with type definitions for id, label, and icon
5. THE Sidebar SHALL emit an onNavigate callback when navigation items are clicked with the selected item id
