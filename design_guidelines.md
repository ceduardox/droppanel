# Design Guidelines: Sales Management System

## Design Approach: Material Design System

**Rationale:** This is a utility-focused, data-heavy business application requiring efficient data entry, clear reporting, and reliable functionality. Material Design provides excellent patterns for forms, tables, and data visualization while maintaining professional aesthetics.

## Core Design Elements

### A. Color Palette

**Light Mode:**
- Primary: 211 94% 43% (Professional blue for headers, primary actions)
- Primary Variant: 211 94% 35% (Darker blue for hover states)
- Secondary: 142 71% 45% (Green for success states, profit indicators)
- Error: 0 84% 60% (Red for validation errors)
- Background: 0 0% 98% (Off-white main background)
- Surface: 0 0% 100% (White cards and panels)
- Text Primary: 0 0% 13% (Near-black for main content)
- Text Secondary: 0 0% 38% (Gray for supporting text)

**Dark Mode:**
- Primary: 211 82% 65% (Lighter blue for visibility)
- Primary Variant: 211 82% 55%
- Secondary: 142 60% 55%
- Error: 0 70% 65%
- Background: 220 13% 10% (Dark charcoal)
- Surface: 220 13% 14% (Slightly lighter panels)
- Text Primary: 0 0% 95%
- Text Secondary: 0 0% 70%

### B. Typography

**Font Family:** Inter (via Google Fonts CDN)

**Hierarchy:**
- H1 (Dashboard Title): text-3xl font-bold
- H2 (Section Headers): text-2xl font-semibold
- H3 (Card Titles): text-xl font-semibold
- Body (Forms, Data): text-base font-normal
- Labels: text-sm font-medium uppercase tracking-wide
- Small Text (Metadata): text-xs font-normal

### C. Layout System

**Spacing Primitives:** Tailwind units of 2, 4, 6, 8, 12, 16
- Component padding: p-6
- Card spacing: gap-6
- Form field spacing: space-y-4
- Section margins: my-8 to my-12

**Grid System:**
- Dashboard: 12-column grid (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)
- Forms: Single column max-w-2xl centered
- Reports: Full-width tables with responsive scroll

### D. Component Library

**Navigation:**
- Top navbar: Fixed header with logo, user menu, logout
- Sidebar: Collapsible navigation (Dashboard, Products, Sales, Reports, Settings)
- Mobile: Hamburger menu with slide-out drawer

**Forms:**
- Input fields: Outlined style with floating labels
- Buttons: Elevated (primary actions), text (secondary), outlined (tertiary)
- Dropdowns: Material-style select with icons
- Date picker: Calendar overlay with clear visual feedback
- Image upload: Drag-and-drop zone with preview

**Data Displays:**
- Cards: Elevated with subtle shadow (shadow-md), rounded corners (rounded-lg)
- Tables: Striped rows for readability, sticky headers, sortable columns
- Statistics Cards: Large numbers with trend indicators
- Report Sections: Collapsible accordions for detailed breakdowns

**Sales Entry Components:**
- Product selector: Autocomplete dropdown with product images
- Quantity input: Number stepper with +/- buttons
- Date selector: Calendar with preset options (Today, Yesterday, This Week)
- Live calculation display: Prominent card showing real-time totals

**Report Components:**
- Summary cards: Total sales, profits, per-partner breakdown
- Detailed list: Expandable items showing product-level calculations
- Partner profit split: Visual 50/50 indicator with amounts
- WhatsApp preview: Mock message card before sending

**Buttons:**
- Primary: bg-primary text-white with hover elevation
- Secondary: border-primary text-primary outlined
- Success: bg-secondary for "Send Report" action
- Icon buttons: Rounded with hover background

**Overlays:**
- Modals: Centered with backdrop blur
- Toasts: Top-right notifications for success/error states
- Loading states: Skeleton screens for data loading

### E. Animations

**Minimal, Purposeful:**
- Form validation: Subtle shake on error
- Success states: Quick checkmark animation
- Page transitions: Fade (duration-200)
- No decorative animations

## Page-Specific Layouts

**Login/Registration:**
- Centered card (max-w-md)
- Logo at top
- Form fields with clear labels
- Remember me checkbox
- Link to switch between login/register

**Dashboard:**
- Grid of statistics cards (sales today, this week, this month)
- Quick actions bar (New Sale, Add Product)
- Recent sales table preview

**Product Management:**
- Table view of all products
- Add Product button (top right)
- Each row: Image thumbnail, name, price, cost, actions
- Edit modal with image preview

**Sales Entry:**
- Step-by-step form layout
- Product selector at top
- Quantity and date inputs
- Live calculation card (sticky on scroll)
- Submit button (prominent, green)

**Reports:**
- Filter bar (date range, product)
- Summary cards (total revenue, costs, profits)
- Partner breakdown (two columns, 50/50 split highlighted)
- Detailed transaction list
- WhatsApp send section (phone number input + send button)

## Images

**Product Images:**
- Thumbnails in tables: 48px × 48px rounded
- Product cards: 200px × 200px
- Upload preview: 300px × 300px
- Placeholder: Gray background with icon for products without images

**No Hero Image:** This is a utility application focused on functionality, not marketing.

## Accessibility

- All form inputs labeled
- Color contrast WCAG AA compliant
- Keyboard navigation for all actions
- Error messages clear and descriptive
- Success confirmations prominent
- Dark mode maintains readability

## WhatsApp Integration Visual

- Country code dropdown (Bolivia flag icon)
- Phone number input with format hint
- Preview card showing exact message format
- Send button with WhatsApp green color (142 70% 49%)