// SearchableSelect.jsx
import { useState, useRef, useEffect, useMemo } from "react";

export default function SearchableSelect({
  options = [],       // array of strings
  value,              // controlled value
  onChange,           // (value) => void
  placeholder = "Select an option…",
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapRef = useRef(null);
  const searchRef = useRef(null);

  const normalizedOptions = useMemo(() => options.map((option) => {
    if (typeof option === 'string') {
      return { label: option, value: option };
    }
    return { label: option.label ?? String(option.value ?? ''), value: option.value ?? option.label ?? '' };
  }), [options]);

  const filtered = useMemo(() => normalizedOptions.filter((option) =>
    option.label.toLowerCase().includes(query.toLowerCase())
  ), [normalizedOptions, query]);

  useEffect(() => {
    if (!open) {
      setActiveIndex(-1);
      return;
    }
    const currentIndex = filtered.findIndex((option) => String(option.value) === String(value));
    setActiveIndex(filtered.length ? (currentIndex >= 0 ? currentIndex : 0) : -1);
  }, [open, value, query, normalizedOptions, filtered.length]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Focus search when dropdown opens
  useEffect(() => {
    if (open) {
      setQuery("");
      searchRef.current?.focus();
    }
  }, [open]);

  const select = (option) => {
    onChange(option.value);
    setOpen(false);
  };

  const handleSearchKeyDown = (event) => {
    if (!open) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (filtered.length ? (index + 1) % filtered.length : -1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (filtered.length ? (index <= 0 ? filtered.length - 1 : index - 1) : -1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (activeIndex >= 0 && filtered[activeIndex]) {
        select(filtered[activeIndex]);
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div ref={wrapRef} style={{ position: "relative", width: "100%" }}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          height: 38,
          padding: "0 32px 0 10px",
          border: "1px solid #ccc",
          borderRadius: 6,
          background: "#fff",
          cursor: "pointer",
          textAlign: "left",
          fontSize: 14,
          color: value ? "#111" : "#999",
          position: "relative",
        }}
      >
        {normalizedOptions.find((option) => String(option.value) === String(value))?.label || placeholder}
        <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
          {open ? "▲" : "▼"}
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "#fff",
            border: "1px solid #ccc",
            borderRadius: 6,
            zIndex: 1000,
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            overflow: "hidden",
          }}
        >
          {/* Search input */}
          <div style={{ padding: 6, borderBottom: "1px solid #eee" }}>
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search…"
              style={{
                width: "100%",
                height: 30,
                padding: "0 8px",
                border: "1px solid #ddd",
                borderRadius: 4,
                fontSize: 13,
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Options list */}
          <div style={{ maxHeight: 200, overflowY: "auto" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "10px", fontSize: 13, color: "#999", textAlign: "center" }}>
                No results
              </div>
            ) : (
              filtered.map((option) => (
                <div
                  key={option.value}
                  onClick={() => select(option)}
                  onMouseEnter={() => setActiveIndex(filtered.findIndex((item) => String(item.value) === String(option.value)))}
                  style={{
                    padding: "8px 10px",
                    fontSize: 13,
                    cursor: "pointer",
                    background: filtered[activeIndex]?.value === option.value ? "#e8f2ff" : String(option.value) === String(value) ? "#f0f0f0" : "transparent",
                    fontWeight: filtered[activeIndex]?.value === option.value || String(option.value) === String(value) ? 500 : 400,
                    color: filtered[activeIndex]?.value === option.value ? "#0066cc" : String(option.value) === String(value) ? "#0066cc" : "#111",
                  }}
                  onMouseLeave={(e) => (e.currentTarget.style.background = filtered[activeIndex]?.value === option.value ? "#e8f2ff" : String(option.value) === String(value) ? "#f0f0f0" : "transparent")}
                >
                  {option.label}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}