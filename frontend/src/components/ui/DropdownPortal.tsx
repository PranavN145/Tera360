"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";

interface DropdownPortalProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
  align?: "left" | "right";
  offset?: number;
  className?: string;
  role?: string;
  "aria-label"?: string;
}

export default function DropdownPortal({
  isOpen,
  onClose,
  triggerRef,
  children,
  align = "right",
  offset = 8,
  className = "",
  role = "region",
  "aria-label": ariaLabel,
}: DropdownPortalProps) {
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
    maxHeight: number;
    maxWidth: number;
  }>({
    maxHeight: 500,
    maxWidth: 384,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const updatePosition = useCallback(() => {
    if (!isOpen || !triggerRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Safety margins from screen edges
    const margin = 12;
    const availableWidth = viewportWidth - margin * 2;
    const maxWidth = Math.min(availableWidth, 384);

    // Vertical positioning & collision detection
    const spaceBelow = viewportHeight - triggerRect.bottom - offset;
    const spaceAbove = triggerRect.top - offset;
    const shouldFlip = spaceBelow < 280 && spaceAbove > spaceBelow;

    let top: number | undefined;
    let bottom: number | undefined;
    let maxHeight: number;

    if (shouldFlip) {
      bottom = viewportHeight - triggerRect.top + offset;
      maxHeight = Math.max(160, spaceAbove - margin);
    } else {
      top = triggerRect.bottom + offset;
      maxHeight = Math.max(160, spaceBelow - margin);
    }

    // Horizontal positioning
    let left: number | undefined;
    let right: number | undefined;

    if (align === "right") {
      const rightDistance = viewportWidth - triggerRect.right;
      right = Math.max(margin, Math.min(rightDistance, viewportWidth - maxWidth - margin));
    } else {
      left = Math.max(margin, Math.min(triggerRect.left, viewportWidth - maxWidth - margin));
    }

    setCoords({
      top,
      bottom,
      left,
      right,
      maxHeight,
      maxWidth,
    });
  }, [isOpen, triggerRef, align, offset]);

  // Track position changes on scroll or resize
  useEffect(() => {
    if (!isOpen) return;

    updatePosition();

    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener("scroll", handleScrollOrResize, { capture: true, passive: true });
    window.addEventListener("resize", handleScrollOrResize, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, { capture: true });
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen, updatePosition]);

  // Click outside and Escape key handling
  useEffect(() => {
    if (!isOpen) return;

    function handleMouseDown(event: MouseEvent) {
      const target = event.target as Node;
      // If clicking inside the dropdown panel, do not close
      if (panelRef.current && panelRef.current.contains(target)) {
        return;
      }
      // If clicking the trigger button itself, let trigger button handle toggle
      if (triggerRef.current && triggerRef.current.contains(target)) {
        return;
      }
      onClose();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        // Return focus to trigger element for accessibility
        if (triggerRef.current && typeof triggerRef.current.focus === "function") {
          triggerRef.current.focus();
        }
      }
    }

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose, triggerRef]);

  if (!mounted || !isOpen) {
    return null;
  }

  return createPortal(
    <div
      ref={panelRef}
      role={role}
      aria-label={ariaLabel}
      style={{
        position: "fixed",
        top: coords.top !== undefined ? `${coords.top}px` : undefined,
        bottom: coords.bottom !== undefined ? `${coords.bottom}px` : undefined,
        left: coords.left !== undefined ? `${coords.left}px` : undefined,
        right: coords.right !== undefined ? `${coords.right}px` : undefined,
        maxHeight: `${coords.maxHeight}px`,
        maxWidth: `${coords.maxWidth}px`,
        width: "100%",
        zIndex: 9999, // Dropdown panels float above header, sidebar, and all content
      }}
      className={`overflow-y-auto overscroll-contain shadow-2xl rounded-2xl bg-[#FAF8F2] border border-[#173D32]/15 text-[#173D32] animate-in fade-in zoom-in-95 duration-150 ${className}`}
    >
      {children}
    </div>,
    document.body
  );
}

