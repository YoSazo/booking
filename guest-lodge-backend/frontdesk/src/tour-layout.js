const DEFAULT_MARGIN = 14;
const DEFAULT_GAP = 10;

function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
}

function rectFromValues(left, top, width, height) {
  return {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
  };
}

function viewportRect() {
  const viewport = window.visualViewport;
  const left = viewport ? viewport.offsetLeft : 0;
  const top = viewport ? viewport.offsetTop : 0;
  const width = viewport ? viewport.width : window.innerWidth;
  const height = viewport ? viewport.height : window.innerHeight;
  return rectFromValues(left, top, width, height);
}

function elementRect(element) {
  if (!element || !element.isConnected) return null;
  const rect = element.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) return null;
  return rectFromValues(rect.left, rect.top, rect.width, rect.height);
}

function intersectionArea(a, b) {
  if (!a || !b) return 0;
  const width = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
  const height = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  return width * height;
}

function overflowAmount(rect, bounds) {
  return Math.max(0, bounds.left - rect.left)
    + Math.max(0, rect.right - bounds.right)
    + Math.max(0, bounds.top - rect.top)
    + Math.max(0, rect.bottom - bounds.bottom);
}

function visibleBottomInset(viewport, selectors) {
  let inset = 0;
  for (const selector of selectors || []) {
    const element = document.querySelector(selector);
    if (!element || getComputedStyle(element).display === 'none') continue;
    const rect = elementRect(element);
    if (!rect || rect.bottom < viewport.bottom - 2 || rect.top >= viewport.bottom) continue;
    inset = Math.max(inset, viewport.bottom - rect.top);
  }
  return inset;
}

function safeViewport(options) {
  const viewport = viewportRect();
  const margin = options.margin ?? DEFAULT_MARGIN;
  const bottomInset = Math.max(
    Number(options.bottomInset || 0),
    visibleBottomInset(viewport, options.avoidBottomSelectors)
  );
  const left = viewport.left + margin + Number(options.leftInset || 0);
  const top = viewport.top + margin + Number(options.topInset || 0);
  const right = viewport.right - margin - Number(options.rightInset || 0);
  const bottom = viewport.bottom - margin - bottomInset;
  return rectFromValues(left, top, Math.max(1, right - left), Math.max(1, bottom - top));
}

function placementOrder(preferred) {
  if (preferred === 'above' || preferred === 'top') return ['top', 'bottom', 'right', 'left'];
  if (preferred === 'right') return ['right', 'left', 'bottom', 'top'];
  if (preferred === 'left') return ['left', 'right', 'bottom', 'top'];
  return ['bottom', 'top', 'right', 'left'];
}

function candidateRect(placement, anchor, width, height, gap) {
  if (placement === 'top') {
    return rectFromValues(anchor.left + (anchor.width - width) / 2, anchor.top - height - gap, width, height);
  }
  if (placement === 'right') {
    return rectFromValues(anchor.right + gap, anchor.top + (anchor.height - height) / 2, width, height);
  }
  if (placement === 'left') {
    return rectFromValues(anchor.left - width - gap, anchor.top + (anchor.height - height) / 2, width, height);
  }
  return rectFromValues(anchor.left + (anchor.width - width) / 2, anchor.bottom + gap, width, height);
}

function clampRect(rect, safe) {
  const left = clamp(rect.left, safe.left, Math.max(safe.left, safe.right - rect.width));
  const top = clamp(rect.top, safe.top, Math.max(safe.top, safe.bottom - rect.height));
  return rectFromValues(left, top, rect.width, rect.height);
}

function scrollParent(element) {
  let node = element && element.parentElement;
  while (node && node !== document.body && node !== document.documentElement) {
    const style = getComputedStyle(node);
    const overflowY = style.overflowY || style.overflow;
    if (/(auto|scroll)/.test(overflowY) && node.scrollHeight > node.clientHeight + 1) return node;
    node = node.parentElement;
  }
  return null;
}

function scrollElementBy(element, delta) {
  if (!element || Math.abs(delta) < 1) return false;
  const parent = scrollParent(element);
  if (parent) {
    parent.scrollTop += delta;
  } else {
    window.scrollBy({ top: delta, left: 0, behavior: 'auto' });
  }
  return true;
}

function fitTargetIntoArea(target, area) {
  const rect = elementRect(target);
  if (!rect || area.height < 60) return false;

  let desiredTop;
  if (rect.height <= area.height) {
    desiredTop = clamp(rect.top, area.top, area.bottom - rect.height);
  } else {
    // A tall spotlight cannot fit beside the tooltip. Keep its bottom edge
    // visible above the dock and let the document remain scrollable so the
    // user can inspect the rest without the two surfaces covering each other.
    desiredTop = area.bottom - rect.height;
  }
  return scrollElementBy(target, rect.top - desiredTop);
}

function copyComputedStyles(source, clone) {
  const computed = getComputedStyle(source);
  for (const property of computed) {
    clone.style.setProperty(property, computed.getPropertyValue(property), computed.getPropertyPriority(property));
  }
  const sourceChildren = source.children;
  const cloneChildren = clone.children;
  for (let index = 0; index < sourceChildren.length; index += 1) {
    if (cloneChildren[index]) copyComputedStyles(sourceChildren[index], cloneChildren[index]);
  }
}

function stripCloneIds(root) {
  root.removeAttribute('id');
  root.querySelectorAll('[id]').forEach((element) => element.removeAttribute('id'));
}

function syncCloneFields(source, clone) {
  const sourceFields = source.querySelectorAll('input, textarea, select');
  const cloneFields = clone.querySelectorAll('input, textarea, select');
  sourceFields.forEach((field, index) => {
    const cloneField = cloneFields[index];
    if (!cloneField) return;
    if (field.type === 'checkbox' || field.type === 'radio') cloneField.checked = field.checked;
    else cloneField.value = field.value;
  });
}

function createTourSpotlightClone(source, options = {}) {
  if (!source || !source.isConnected || options.disabled) return null;
  const rect = elementRect(source);
  if (!rect) return null;

  const clone = source.cloneNode(true);
  stripCloneIds(clone);
  copyComputedStyles(source, clone);
  syncCloneFields(source, clone);
  clone.setAttribute(options.attribute || 'data-adaptive-tour-spotlight', '1');
  clone.setAttribute('aria-hidden', 'true');
  clone.style.position = 'fixed';
  clone.style.margin = '0';
  clone.style.maxWidth = 'none';
  clone.style.zIndex = String(options.zIndex || 100002);
  clone.style.pointerEvents = 'none';
  clone.style.transform = 'none';
  options.prepareClone?.(clone, source);

  const originalVisibility = source.style.visibility;
  if (options.hideSource) source.style.visibility = 'hidden';
  document.body.appendChild(clone);

  const update = () => {
    const nextRect = elementRect(source);
    if (!nextRect) {
      clone.style.display = 'none';
      return null;
    }
    clone.style.display = '';
    clone.style.left = `${nextRect.left}px`;
    clone.style.top = `${nextRect.top}px`;
    clone.style.width = `${nextRect.width}px`;
    clone.style.height = `${nextRect.height}px`;
    return nextRect;
  };

  const destroy = () => {
    clone.remove();
    if (options.hideSource) source.style.visibility = originalVisibility;
  };

  update();
  return { element: clone, source, update, destroy };
}

function createAdaptiveTourLayout({
  tooltip,
  panel,
  target,
  anchor,
  spotlight,
  options = {},
}) {
  if (!tooltip || !panel || !target) return null;
  let frame = 0;
  let destroyed = false;
  let hasAutoScrolled = false;
  let pendingAllowScroll = false;
  let viewportSignature = '';

  const applyLayout = (allowScroll = true) => {
    if (destroyed || !tooltip.isConnected || !target.isConnected) return null;
    const safe = safeViewport(options);
    const nextViewportSignature = `${safe.left}:${safe.top}:${safe.width}:${safe.height}`;
    if (viewportSignature && viewportSignature !== nextViewportSignature) {
      hasAutoScrolled = false;
      allowScroll = true;
    }
    viewportSignature = nextViewportSignature;
    const anchorRect = elementRect(anchor) || elementRect(target);
    const targetRect = elementRect(target);
    if (!anchorRect || !targetRect) return null;

    const width = Math.min(Number(options.maxWidth || 380), safe.width);
    tooltip.style.position = 'fixed';
    tooltip.style.right = 'auto';
    tooltip.style.bottom = 'auto';
    tooltip.style.width = `${width}px`;
    tooltip.style.maxWidth = `${width}px`;
    tooltip.style.margin = '0';
    tooltip.style.justifyContent = 'flex-start';
    panel.style.maxHeight = `${Math.max(120, safe.height)}px`;

    const panelHeight = Math.min(panel.offsetHeight || tooltip.offsetHeight || 190, safe.height);
    const gap = Number(options.gap ?? DEFAULT_GAP);
    if (
      allowScroll
      && !hasAutoScrolled
      && options.autoScroll !== false
      && targetRect.height + panelHeight + gap <= safe.height
    ) {
      hasAutoScrolled = fitTargetIntoArea(target, safe);
      if (hasAutoScrolled) {
        requestAnimationFrame(() => applyLayout(false));
      }
    }
    const order = placementOrder(options.preferredPlacement);
    const candidates = order.map((placement, index) => {
      const raw = candidateRect(placement, anchorRect, width, panelHeight, gap);
      const overflow = overflowAmount(raw, safe);
      const overlap = intersectionArea(raw, targetRect);
      return {
        placement,
        index,
        raw,
        overflow,
        overlap,
        score: overflow * 100000 + overlap * 100 + index,
      };
    });
    const exact = candidates.find((candidate) => candidate.overflow < 0.5 && candidate.overlap < 1);
    const best = exact || candidates.slice().sort((a, b) => a.score - b.score)[0];
    const shouldDock = options.forceDock === true || !exact;

    let mode = 'floating';
    let positioned;
    if (shouldDock) {
      mode = 'docked';
      const dockHeight = Math.min(
        panelHeight,
        Number(options.dockMaxHeight || Math.max(180, safe.height * 0.42)),
        safe.height
      );
      panel.style.maxHeight = `${dockHeight}px`;
      const measuredDockHeight = Math.min(panel.offsetHeight || dockHeight, dockHeight);
      positioned = rectFromValues(
        safe.left + (safe.width - width) / 2,
        safe.bottom - measuredDockHeight,
        width,
        measuredDockHeight
      );
      if (allowScroll && !hasAutoScrolled && options.autoScroll !== false) {
        const targetArea = rectFromValues(
          safe.left,
          safe.top,
          safe.width,
          Math.max(60, positioned.top - gap - safe.top)
        );
        hasAutoScrolled = fitTargetIntoArea(target, targetArea);
        if (hasAutoScrolled) {
          requestAnimationFrame(() => applyLayout(false));
        }
      }
    } else {
      positioned = clampRect(best.raw, safe);
      if (allowScroll && !hasAutoScrolled && options.autoScroll !== false) {
        let targetArea = safe;
        if (best.placement === 'bottom') {
          targetArea = rectFromValues(
            safe.left,
            safe.top,
            safe.width,
            Math.max(60, positioned.top - gap - safe.top)
          );
        } else if (best.placement === 'top') {
          const targetTop = positioned.bottom + gap;
          targetArea = rectFromValues(
            safe.left,
            targetTop,
            safe.width,
            Math.max(60, safe.bottom - targetTop)
          );
        }
        hasAutoScrolled = fitTargetIntoArea(target, targetArea);
        if (hasAutoScrolled) {
          requestAnimationFrame(() => applyLayout(false));
        }
      }
    }

    tooltip.dataset.tourLayoutMode = mode;
    tooltip.dataset.tourPlacement = shouldDock ? 'bottom-dock' : best.placement;
    tooltip.style.left = `${positioned.left}px`;
    tooltip.style.top = `${positioned.top}px`;
    spotlight?.update?.();
    options.onLayout?.({
      mode,
      placement: tooltip.dataset.tourPlacement,
      viewport: safe,
      targetRect: elementRect(target),
      anchorRect: elementRect(anchor) || elementRect(target),
      tooltipRect: positioned,
    });
    return { mode, placement: tooltip.dataset.tourPlacement, rect: positioned };
  };

  const schedule = (allowScroll = false) => {
    pendingAllowScroll = pendingAllowScroll || allowScroll === true;
    if (destroyed || frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      const shouldScroll = pendingAllowScroll;
      pendingAllowScroll = false;
      applyLayout(shouldScroll);
    });
  };
  const scheduleViewportChange = () => {
    hasAutoScrolled = false;
    schedule(true);
  };

  const resizeObserver = typeof ResizeObserver === 'function'
    ? new ResizeObserver(schedule)
    : null;
  resizeObserver?.observe(target);
  if (anchor && anchor !== target) resizeObserver?.observe(anchor);
  resizeObserver?.observe(panel);

  window.addEventListener('resize', scheduleViewportChange);
  window.addEventListener('orientationchange', scheduleViewportChange);
  window.addEventListener('scroll', schedule, true);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', scheduleViewportChange);
    window.visualViewport.addEventListener('scroll', schedule);
  }

  const destroy = () => {
    destroyed = true;
    if (frame) cancelAnimationFrame(frame);
    resizeObserver?.disconnect();
    window.removeEventListener('resize', scheduleViewportChange);
    window.removeEventListener('orientationchange', scheduleViewportChange);
    window.removeEventListener('scroll', schedule, true);
    if (window.visualViewport) {
      window.visualViewport.removeEventListener('resize', scheduleViewportChange);
      window.visualViewport.removeEventListener('scroll', schedule);
    }
  };

  const result = applyLayout(true);
  return { destroy, reposition: () => applyLayout(false), result };
}

export {
  createAdaptiveTourLayout,
  createTourSpotlightClone,
  elementRect,
  viewportRect,
};
