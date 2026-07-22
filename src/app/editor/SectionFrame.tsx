"use client";

import type { ReactNode } from "react";

export function SectionFrame({
  title,
  onDelete,
  onRestore,
  removed,
  children,
}: {
  title: string;
  onDelete?: () => void;
  onRestore?: () => void;
  removed?: boolean;
  children?: ReactNode;
}) {
  if (removed) {
    return (
      <div className="editor-section editor-section--removed" role="status">
        <div className="editor-section__head">
          <p className="editor-section__removed-label">{title} removed from invoice</p>
          {onRestore ? (
            <button type="button" className="editor-btn" onClick={onRestore}>
              Restore
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <fieldset className="editor-section">
      <legend className="editor-section__legend">
        <span>{title}</span>
        {onDelete ? (
          <button
            type="button"
            className="editor-btn editor-btn--danger editor-btn--tiny"
            onClick={onDelete}
            aria-label={`Delete ${title} section`}
          >
            Delete
          </button>
        ) : null}
      </legend>
      {children}
    </fieldset>
  );
}
