"use client";

import { useState } from "react";
import { PAN_PRESETS, type PanShape, type PanSize } from "@/lib/panSize";

const CUSTOM_PRESET_ID = "custom";

function presetIdForSize(size: PanSize | null): string {
  if (!size) return "";
  const match = PAN_PRESETS.find(
    (p) =>
      p.size.shape === size.shape &&
      p.size.widthIn === size.widthIn &&
      p.size.heightIn === size.heightIn &&
      p.size.diameterIn === size.diameterIn,
  );
  return match?.id ?? CUSTOM_PRESET_ID;
}

export function PanSizeField({
  value,
  onChange,
}: {
  value: PanSize | null;
  onChange: (size: PanSize | null) => void;
}) {
  const [enabled, setEnabled] = useState(value !== null);
  const [presetId, setPresetId] = useState(() => presetIdForSize(value));
  const [shape, setShape] = useState<PanShape>(value?.shape ?? "rectangle");
  const [widthIn, setWidthIn] = useState(value?.widthIn ?? 9);
  const [heightIn, setHeightIn] = useState(value?.heightIn ?? 13);
  const [diameterIn, setDiameterIn] = useState(value?.diameterIn ?? 9);

  function emit(next: { shape: PanShape; widthIn: number; heightIn: number; diameterIn: number }) {
    onChange(
      next.shape === "round"
        ? { shape: "round", diameterIn: next.diameterIn }
        : { shape: "rectangle", widthIn: next.widthIn, heightIn: next.heightIn },
    );
  }

  function handlePresetChange(id: string) {
    setPresetId(id);
    if (id === CUSTOM_PRESET_ID) return;
    const preset = PAN_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    setShape(preset.size.shape);
    if (preset.size.shape === "round") setDiameterIn(preset.size.diameterIn ?? 9);
    else {
      setWidthIn(preset.size.widthIn ?? 9);
      setHeightIn(preset.size.heightIn ?? 13);
    }
    emit({
      shape: preset.size.shape,
      widthIn: preset.size.widthIn ?? 9,
      heightIn: preset.size.heightIn ?? 13,
      diameterIn: preset.size.diameterIn ?? 9,
    });
  }

  if (!enabled) {
    return (
      <div>
        <button
          type="button"
          onClick={() => {
            setEnabled(true);
            emit({ shape, widthIn, heightIn, diameterIn });
          }}
          className="text-sm underline text-black/70 dark:text-white/70"
        >
          + Record this recipe&apos;s pan size (optional)
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="block text-sm font-medium">Pan size (optional)</span>
        <button
          type="button"
          onClick={() => {
            setEnabled(false);
            onChange(null);
          }}
          className="text-xs text-black/50 dark:text-white/50 hover:underline"
        >
          Remove
        </button>
      </div>
      <p className="text-xs text-black/50 dark:text-white/50 mb-2">
        Recording the pan this recipe was written for lets you scale it to a different vessel by
        area when you use it in an event.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={presetId}
          onChange={(e) => handlePresetChange(e.target.value)}
          className="rounded-md border border-black/20 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
        >
          <option value="">Choose a pan…</option>
          {PAN_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
          <option value={CUSTOM_PRESET_ID}>Custom size</option>
        </select>

        {presetId === CUSTOM_PRESET_ID && (
          <>
            <select
              value={shape}
              onChange={(e) => {
                const nextShape = e.target.value as PanShape;
                setShape(nextShape);
                emit({ shape: nextShape, widthIn, heightIn, diameterIn });
              }}
              className="rounded-md border border-black/20 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
            >
              <option value="rectangle">Rectangular</option>
              <option value="round">Round</option>
            </select>
            {shape === "rectangle" ? (
              <>
                <input
                  type="number"
                  min={1}
                  value={widthIn}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setWidthIn(v);
                    emit({ shape, widthIn: v, heightIn, diameterIn });
                  }}
                  className="w-20 rounded-md border border-black/20 dark:border-white/20 bg-transparent px-2 py-2 text-sm"
                  aria-label="Pan width in inches"
                />
                <span className="text-sm text-black/50 dark:text-white/50">x</span>
                <input
                  type="number"
                  min={1}
                  value={heightIn}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setHeightIn(v);
                    emit({ shape, widthIn, heightIn: v, diameterIn });
                  }}
                  className="w-20 rounded-md border border-black/20 dark:border-white/20 bg-transparent px-2 py-2 text-sm"
                  aria-label="Pan length in inches"
                />
                <span className="text-sm text-black/50 dark:text-white/50">in</span>
              </>
            ) : (
              <>
                <input
                  type="number"
                  min={1}
                  value={diameterIn}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setDiameterIn(v);
                    emit({ shape, widthIn, heightIn, diameterIn: v });
                  }}
                  className="w-20 rounded-md border border-black/20 dark:border-white/20 bg-transparent px-2 py-2 text-sm"
                  aria-label="Pan diameter in inches"
                />
                <span className="text-sm text-black/50 dark:text-white/50">in diameter</span>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
