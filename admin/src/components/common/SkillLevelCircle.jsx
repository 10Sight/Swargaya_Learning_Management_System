import React from "react";

/**
 * Resolves a level name or index to 1-based slice fill count.
 * - Unassigned / empty / L0 => 0 slices filled (empty circle with partition lines)
 * - L1 (order 0, 1st level) => 1 slice filled
 * - L2 (order 1, 2nd level) => 2 slices filled
 * - Top level => all slices filled (full solid circle)
 */
export const getLevelFillCount = (levelInput, levels = []) => {
  if (
    levelInput === null ||
    levelInput === undefined ||
    levelInput === "" ||
    levelInput === "L0" ||
    levelInput === "-"
  ) {
    return 0;
  }

  // If a 0-based index or order was passed directly
  if (typeof levelInput === "number") {
    return levelInput >= 0 ? levelInput + 1 : 0;
  }

  const levelStr = String(levelInput).trim().toUpperCase();

  // If levels configuration is provided, sort by order and match by name
  if (Array.isArray(levels) && levels.length > 0) {
    const sortedLevels = [...levels].sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0)
    );
    const idx = sortedLevels.findIndex(
      (l) => String(l.name || l).trim().toUpperCase() === levelStr
    );
    if (idx !== -1) {
      return idx + 1;
    }
    // Name not found in configured levels => treat as unassigned
    return 0;
  }

  // Fallback when levels array is not provided: extract numeric digit
  // e.g. "L1" => 1, "L2" => 2, "L5" => 5
  const num = parseInt(levelStr.replace(/\D/g, ""), 10);
  return isNaN(num) ? 0 : Math.max(0, num);
};

/**
 * Backward compatibility helper for existing callers expecting 0-based index
 */
export const getLevelIndex = (levelInput, levels = []) => {
  const fill = getLevelFillCount(levelInput, levels);
  return Math.max(0, fill - 1);
};

/**
 * SkillLevelCircle
 * Renders circular level symbol with N radial slices:
 * - Total slices = total configured levels N (default 5)
 * - Filled slices:
 *   - Unassigned / L0 => 0 slices filled
 *   - Order 0 (L1) => 1 slice filled
 *   - Order 1 (L2) => 2 slices filled
 *   - Order N-1 (Top Level) => N slices filled (solid circle)
 */
export const SkillLevelCircle = ({
  levelName,
  levelIndex,
  levels = [],
  size = 18,
  fillColor = "#000000",
  strokeColor = "#000000",
  className = "",
  title,
}) => {
  const numLevels =
    Array.isArray(levels) && levels.length > 0 ? levels.length : 5;
  const totalSlices = Math.max(1, numLevels);

  // Determine fill count (0 to totalSlices)
  const resolvedFill =
    levelIndex !== undefined && levelIndex !== null
      ? levelIndex >= 0
        ? Math.min(levelIndex + 1, totalSlices)
        : 0
      : Math.min(getLevelFillCount(levelName, levels), totalSlices);

  const center = size / 2;
  const radius = size / 2.2;

  const createSlicePath = (startAngle, endAngle) => {
    const startRad = ((startAngle - 90) * Math.PI) / 180;
    const endRad = ((endAngle - 90) * Math.PI) / 180;
    const x1 = center + radius * Math.cos(startRad);
    const y1 = center + radius * Math.sin(startRad);
    const x2 = center + radius * Math.cos(endRad);
    const y2 = center + radius * Math.sin(endRad);
    return `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`;
  };

  const sliceAngle = 360 / totalSlices;
  const slices = Array.from({ length: totalSlices }, (_, i) =>
    createSlicePath(i * sliceAngle, (i + 1) * sliceAngle)
  );

  return (
    <svg
      className={`inline-block flex-shrink-0 align-middle ${className}`}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-label={title || `Level ${levelName || resolvedFill}`}
    >
      {title && <title>{title}</title>}

      {totalSlices === 1 ? (
        // Single level configuration
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill={resolvedFill >= 1 ? fillColor : "none"}
          stroke={strokeColor}
          strokeWidth="1.2"
        />
      ) : (
        <>
          {/* Background radial slice lines */}
          {slices.map((d, i) => (
            <path
              key={`bg-${i}`}
              d={d}
              fill="none"
              stroke={strokeColor}
              strokeWidth="0.5"
            />
          ))}

          {/* Filled radial slices */}
          {resolvedFill >= totalSlices ? (
            // Full circle optimization to avoid sub-pixel seams
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="0.5"
            />
          ) : (
            slices.map((d, i) => {
              if (i < resolvedFill) {
                return (
                  <path
                    key={`fill-${i}`}
                    d={d}
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth="0.5"
                  />
                );
              }
              return null;
            })
          )}

          {/* Outer crisp circle border */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth="1.2"
          />
        </>
      )}
    </svg>
  );
};

export default SkillLevelCircle;
