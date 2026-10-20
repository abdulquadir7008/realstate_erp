import {
  LayoutDashboard,
  Sparkles,
  BarChart3,
  KanbanSquare,
  Users,
  CalendarCheck,
  TrendingUp,
  Building2,
  Layers,
  Wallet,
  Receipt,
  FileText,
  Landmark,
  Boxes,
  ShieldCheck,
  HardHat,
  ClipboardList,
  PackageSearch,
  ShoppingCart,
  Truck,
  Warehouse,
  Boxes as BoxesIcon,
  UserCog,
  CalendarClock,
  CalendarX2,
  LifeBuoy,
  KeyRound,
  Files,
  Workflow,
  Network,
  GitBranch,
  Landmark as LandmarkIcon,
  Percent,
  UserPlus,
  Bell,
  Settings,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  perm?: string;
  badge?: 'ai';
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, perm: 'dashboard:read' },
      { label: 'AI Command Center', href: '/dashboard/ai', icon: Sparkles, perm: 'settings:read', badge: 'ai' },
      { label: 'Reports & Analytics', href: '/dashboard/analytics', icon: BarChart3, perm: 'report:read' },
    ],
  },
  {
    title: 'Sales & CRM',
    items: [
      { label: 'CRM & Leads', href: '/dashboard/crm', icon: KanbanSquare, perm: 'lead:read' },
      { label: 'Customers', href: '/dashboard/customers', icon: Users, perm: 'customer:read' },
      { label: 'Bookings', href: '/dashboard/bookings', icon: CalendarCheck, perm: 'booking:read' },
      { label: 'Sales', href: '/dashboard/sales', icon: TrendingUp, perm: 'booking:read' },
    ],
  },
  {
    title: 'Property',
    items: [
      { label: 'Projects', href: '/dashboard/projects', icon: Building2, perm: 'project:read' },
      { label: 'Property Inventory', href: '/dashboard/inventory', icon: Layers, perm: 'unit:read' },
    ],
  },
  {
    title: 'Finance',
    items: [
      { label: 'Finance Overview', href: '/dashboard/finance', icon: Wallet, perm: 'payment:read' },
      { label: 'Payments', href: '/dashboard/payments', icon: Receipt, perm: 'payment:read' },
      { label: 'Demands', href: '/dashboard/demands', icon: FileText, perm: 'demand:read' },
      { label: 'Invoices', href: '/dashboard/invoices', icon: FileText, perm: 'invoice:read' },
      { label: 'Accounts', href: '/dashboard/accounts', icon: Landmark, perm: 'account:read' },
      { label: 'Expenses', href: '/dashboard/expenses', icon: Wallet, perm: 'expense:read' },
    ],
  },
  {
    title: 'Construction',
    items: [
      { label: 'Tasks', href: '/dashboard/tasks', icon: HardHat, perm: 'task:read' },
      { label: 'Site Reports', href: '/dashboard/site-reports', icon: ClipboardList, perm: 'task:read' },
      { label: 'Inspections', href: '/dashboard/inspections', icon: ShieldCheck, perm: 'task:read' },
    ],
  },
  {
    title: 'Procurement',
    items: [
      { label: 'Vendors', href: '/dashboard/vendors', icon: Truck, perm: 'vendor:read' },
      { label: 'Materials', href: '/dashboard/materials', icon: PackageSearch, perm: 'material:read' },
      { label: 'Warehouses', href: '/dashboard/warehouses', icon: Warehouse, perm: 'material:read' },
      { label: 'Purchase Orders', href: '/dashboard/purchase-orders', icon: ShoppingCart, perm: 'purchase_order:read' },
      { label: 'Requisitions', href: '/dashboard/requisitions', icon: ClipboardList, perm: 'requisition:read' },
      { label: 'Stock', href: '/dashboard/stock', icon: Boxes, perm: 'material:read' },
    ],
  },
  {
    title: 'People',
    items: [
      { label: 'Employees', href: '/dashboard/employees', icon: UserCog, perm: 'employee:read' },
      { label: 'Attendance', href: '/dashboard/attendance', icon: CalendarClock, perm: 'employee:read' },
      { label: 'Leave Requests', href: '/dashboard/leaves', icon: CalendarX2, perm: 'employee:read' },
    ],
  },
  {
    title: 'Service & Documents',
    items: [
      { label: 'Support Tickets', href: '/dashboard/tickets', icon: LifeBuoy, perm: 'ticket:read' },
      { label: 'Handovers', href: '/dashboard/handovers', icon: KeyRound, perm: 'ticket:read' },
      { label: 'Documents', href: '/dashboard/documents', icon: Files, perm: 'document:read' },
    ],
  },
  {
    title: 'Automation',
    items: [
      { label: 'Workflows', href: '/dashboard/workflows', icon: Workflow, perm: 'workflow:read' },
      { label: 'Notifications', href: '/dashboard/notifications', icon: Bell, perm: 'notification:read' },
    ],
  },
  {
    title: 'Administration',
    items: [
      { label: 'Organization', href: '/dashboard/organization', icon: Network, perm: 'organization:read' },
      { label: 'Branches', href: '/dashboard/branches', icon: GitBranch, perm: 'organization:read' },
      { label: 'Financial Years', href: '/dashboard/financial-years', icon: LandmarkIcon, perm: 'organization:read' },
      { label: 'Tax Rates', href: '/dashboard/tax-rates', icon: Percent, perm: 'organization:read' },
      { label: 'Users', href: '/dashboard/users', icon: UserPlus, perm: 'user:read' },
      { label: 'Roles & Permissions', href: '/dashboard/roles', icon: ShieldCheck, perm: 'role:read' },
    ],
  },
  {
    title: 'Workspace',
    items: [{ label: 'Settings', href: '/dashboard/settings', icon: Settings, perm: 'settings:read' }],
  },
];

export const QUICK_ACTIONS: { label: string; href: string; icon: LucideIcon; perm?: string }[] = [
  { label: 'Add Lead', href: '/dashboard/crm', icon: KanbanSquare, perm: 'lead:create' },
  { label: 'New Booking', href: '/dashboard/bookings', icon: CalendarCheck, perm: 'booking:create' },
  { label: 'Add Customer', href: '/dashboard/customers', icon: Users, perm: 'customer:create' },
  { label: 'Record Payment', href: '/dashboard/payments', icon: Receipt, perm: 'payment:create' },
  { label: 'Ask AI Assistant', href: '/dashboard/ai', icon: Sparkles },
];
