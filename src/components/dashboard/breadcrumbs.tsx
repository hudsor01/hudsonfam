import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface BreadcrumbSegment {
  label: string;
  href?: string;
}

interface DashboardBreadcrumbsProps {
  items: BreadcrumbSegment[];
}

export function DashboardBreadcrumbs({ items }: DashboardBreadcrumbsProps) {
  return (
    <Breadcrumb className="mb-4">
      <BreadcrumbList className="text-xs text-text-dim">
        <BreadcrumbItem>
          <BreadcrumbLink href="/dashboard" className="text-text-muted hover:text-text">
            Dashboard
          </BreadcrumbLink>
        </BreadcrumbItem>
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <span key={i} className="contents">
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {isLast || !item.href ? (
                  <BreadcrumbPage className="text-text-muted">
                    {item.label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href={item.href} className="text-text-muted hover:text-text">
                    {item.label}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </span>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
