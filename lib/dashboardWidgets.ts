export type DashboardWidgetId =
  | "workspace_progress"
  | "business_xray"
  | "asset_library"
  | "knowledge_sources"
  | "usage_snapshot"
  | "wizard_suggestions"
  | "recent_workspaces"
  | "quick_actions";

export type DashboardWidgetDefinition = {
  id: DashboardWidgetId;
  title: string;
  description: string;
  defaultVisible: boolean;
  size: "small" | "medium" | "wide";
  requiredData?: "workspace" | "usage" | "knowledge" | "assets";
};

export const DASHBOARD_WIDGETS: DashboardWidgetDefinition[] = [
  {
    id: "workspace_progress",
    title: "Workspace Progress",
    description: "Continue the most relevant workspace.",
    defaultVisible: true,
    size: "medium",
    requiredData: "workspace",
  },
  {
    id: "business_xray",
    title: "Business X-Ray",
    description: "Start a structured business scan.",
    defaultVisible: true,
    size: "medium",
  },
  {
    id: "asset_library",
    title: "Asset Library",
    description: "Review saved outputs and generated assets.",
    defaultVisible: true,
    size: "small",
    requiredData: "assets",
  },
  {
    id: "knowledge_sources",
    title: "Knowledge Sources",
    description: "Prepare source material for workspaces.",
    defaultVisible: true,
    size: "small",
    requiredData: "knowledge",
  },
  {
    id: "usage_snapshot",
    title: "Usage Snapshot",
    description: "Track model spend and routing activity.",
    defaultVisible: true,
    size: "small",
    requiredData: "usage",
  },
  {
    id: "wizard_suggestions",
    title: "Wizard Suggestions",
    description: "Recommended next actions.",
    defaultVisible: true,
    size: "wide",
  },
  {
    id: "recent_workspaces",
    title: "Recent Workspaces",
    description: "Jump back into recent systems.",
    defaultVisible: true,
    size: "wide",
    requiredData: "workspace",
  },
  {
    id: "quick_actions",
    title: "Quick Actions",
    description: "High-frequency actions.",
    defaultVisible: true,
    size: "medium",
  },
];

export const DEFAULT_HOME_WIDGETS = DASHBOARD_WIDGETS.filter((widget) => widget.defaultVisible).map((widget) => widget.id);
