import Link from "next/link";
import { routes } from "@/lib/routes";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

type StudioBreadcrumbsProps = {
  items: BreadcrumbItem[];
};

export default function StudioBreadcrumbs({ items }: StudioBreadcrumbsProps) {
  return (
    <nav className="studio-breadcrumbs" aria-label="Breadcrumb">
      <ol>
        <li>
          <Link href={routes.home}>Home</Link>
        </li>
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`}>
            {item.href && index < items.length - 1 ? (
              <Link href={item.href}>{item.label}</Link>
            ) : (
              <span aria-current="page">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
