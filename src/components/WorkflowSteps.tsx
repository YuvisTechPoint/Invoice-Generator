import Link from "next/link";
import { routes } from "@/lib/routes";

export type WorkflowStep = "library" | "edit" | "share";

type WorkflowStepsProps = {
  current: WorkflowStep;
  invoiceLabel?: string;
  invoiceId?: string;
};

const STEPS: { id: WorkflowStep; label: string }[] = [
  { id: "library", label: "Library" },
  { id: "edit", label: "Edit & preview" },
  { id: "share", label: "Issue & share" },
];

export default function WorkflowSteps({
  current,
  invoiceLabel,
  invoiceId,
}: WorkflowStepsProps) {
  const currentIndex = STEPS.findIndex((s) => s.id === current);

  return (
    <nav className="workflow-steps" aria-label="Invoice workflow">
      <ol className="workflow-steps__list">
        {STEPS.map((step, index) => {
          const isComplete = index < currentIndex;
          const isCurrent = step.id === current;
          let href: string = routes.invoices;

          if (step.id === "edit") {
            href = invoiceId ? routes.editor(invoiceId) : routes.editor();
          } else if (step.id === "share" && invoiceId) {
            href = routes.invoicePage(invoiceId, routes.editor(invoiceId));
          } else if (step.id === "share") {
            href = routes.newInvoice;
          }

          return (
            <li
              key={step.id}
              className={`workflow-steps__item${isCurrent ? " workflow-steps__item--current" : ""}${isComplete ? " workflow-steps__item--done" : ""}`}
            >
              <Link href={href} className="workflow-steps__link">
                <span className="workflow-steps__num" aria-hidden>
                  {isComplete ? "✓" : index + 1}
                </span>
                {step.label}
              </Link>
            </li>
          );
        })}
      </ol>
      {invoiceLabel ? (
        <p className="workflow-steps__context">
          Working on <strong>{invoiceLabel}</strong>
        </p>
      ) : null}
    </nav>
  );
}
