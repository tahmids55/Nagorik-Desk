import { Droplets, Ellipsis, GraduationCap, HeartPulse, Leaf, LifeBuoy, Route, ShieldAlert, Sprout, Store, Zap, type LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  Route,
  Zap,
  Droplets,
  HeartPulse,
  GraduationCap,
  Sprout,
  LifeBuoy,
  Store,
  Leaf,
  ShieldAlert,
  Ellipsis,
};

export function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Ellipsis;
  return <Icon className={className ?? "h-4 w-4"} strokeWidth={1.75} aria-hidden="true" />;
}
