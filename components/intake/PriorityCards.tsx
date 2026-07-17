"use client";

import { Reorder, useDragControls } from "framer-motion";
import { useState } from "react";
import { GripIcon, CloseIcon, PlusIcon, PencilIcon } from "@/components/ui/icons";
import { FOCUS_AREAS, type Priority } from "@/lib/types";

let addCounter = 0;

export function PriorityCards({
  priorities,
  onChange,
}: {
  priorities: Priority[];
  onChange: (next: Priority[]) => void;
}) {
  function update(id: string, patch: Partial<Priority>) {
    onChange(priorities.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }
  function remove(id: string) {
    onChange(priorities.filter((p) => p.id !== id));
  }
  function add() {
    const id = `added-${++addCounter}-${Date.now()}`;
    onChange([
      ...priorities,
      {
        id,
        title: "",
        sourceQuote: "",
        description: "Something you'd add in your own words.",
        focusTags: [],
      },
    ]);
  }

  return (
    <div className="space-y-3">
      <Reorder.Group axis="y" values={priorities} onReorder={onChange} className="space-y-3">
        {priorities.map((p) => (
          <PriorityCardItem
            key={p.id}
            priority={p}
            onUpdate={(patch) => update(p.id, patch)}
            onRemove={() => remove(p.id)}
          />
        ))}
      </Reorder.Group>

      <button
        type="button"
        onClick={add}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-hairline py-3 text-sm font-medium text-ink-muted transition-colors hover:border-feather hover:text-ink"
      >
        <PlusIcon width={17} height={17} /> Add something that matters to you
      </button>
    </div>
  );
}

function PriorityCardItem({
  priority,
  onUpdate,
  onRemove,
}: {
  priority: Priority;
  onUpdate: (patch: Partial<Priority>) => void;
  onRemove: () => void;
}) {
  const controls = useDragControls();
  const [showTagPicker, setShowTagPicker] = useState(false);
  const available = FOCUS_AREAS.filter((f) => !priority.focusTags.includes(f));

  return (
    <Reorder.Item
      value={priority}
      dragListener={false}
      dragControls={controls}
      className="group rounded-3xl border border-hairline bg-surface/90 p-4 shadow-[0_12px_32px_rgba(47,90,134,0.08)]"
      whileDrag={{ scale: 1.02, boxShadow: "0 16px 40px rgba(20,96,59,0.16)" }}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          onPointerDown={(e) => controls.start(e)}
          aria-label="Drag to reorder"
          className="mt-1 cursor-grab touch-none text-ink-muted transition-colors hover:text-ink-muted active:cursor-grabbing"
        >
          <GripIcon width={18} height={18} />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <PencilIcon width={14} height={14} className="shrink-0 text-forest" />
            <input
              value={priority.title}
              onChange={(e) => onUpdate({ title: e.target.value })}
              placeholder="Name this in your words…"
              className="w-full border-b border-transparent bg-transparent font-serif text-lg text-ink outline-none transition-colors focus:border-hairline"
            />
          </div>

          {priority.sourceQuote && (
            <p className="mt-1.5 pl-6 text-sm italic text-ink-muted">
              &ldquo;{priority.sourceQuote}&rdquo;
            </p>
          )}
          <p className="mt-1.5 pl-6 text-sm leading-relaxed text-ink-muted">
            {priority.description}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-1.5 pl-6">
            {priority.focusTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-mint-soft px-2.5 py-1 text-[0.72rem] font-medium text-forest-700"
              >
                {tag}
                <button
                  type="button"
                  onClick={() =>
                    onUpdate({ focusTags: priority.focusTags.filter((t) => t !== tag) })
                  }
                  aria-label={`Remove ${tag}`}
                  className="text-forest/60 hover:text-forest"
                >
                  <CloseIcon width={12} height={12} />
                </button>
              </span>
            ))}

            {available.length > 0 &&
              (showTagPicker ? (
                <select
                  autoFocus
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) {
                      onUpdate({ focusTags: [...priority.focusTags, e.target.value] });
                    }
                    setShowTagPicker(false);
                  }}
                  onBlur={() => setShowTagPicker(false)}
                  className="rounded-full border border-hairline bg-surface px-2 py-1 text-[0.72rem] text-ink-muted outline-none"
                >
                  <option value="">choose an area…</option>
                  {available.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowTagPicker(true)}
                  className="inline-flex items-center gap-0.5 rounded-full border border-dashed border-hairline px-2 py-1 text-[0.72rem] text-ink-muted transition-colors hover:border-feather hover:text-ink-muted"
                >
                  <PlusIcon width={12} height={12} /> area
                </button>
              ))}
          </div>
        </div>

        <button
          type="button"
          onClick={onRemove}
          aria-label="Discard this priority"
          className="text-ink-muted opacity-0 transition-opacity hover:text-alert group-hover:opacity-100"
        >
          <CloseIcon width={18} height={18} />
        </button>
      </div>
    </Reorder.Item>
  );
}
