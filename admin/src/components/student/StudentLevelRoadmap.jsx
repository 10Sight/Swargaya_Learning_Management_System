import React from "react";
import { Check, Lock } from "lucide-react";
import { BRAND } from "@/utils/brandColors";

/**
 * Flat horizontal level stepper (L1 -> L2 -> L3 ...). Reads the same
 * `availableCourses` summary the course workspace uses ({ id, title, level,
 * progressPercentage, isLocked, statusLabel }), so status per step always
 * matches what /student/course would show.
 */
const StudentLevelRoadmap = ({ levels = [], availableCourses = [], currentLevel, onSelectCourse }) => {
  const sortedLevels = [...levels].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const getNodeState = (level) => {
    const course = availableCourses.find(
      (c) => c.level?.toUpperCase() === level.name?.toUpperCase()
    );
    if (!course) return { status: "unassigned", course: null };
    if (course.isLocked) return { status: "locked", course };
    if (course.statusLabel === "COMPLETED") return { status: "completed", course };
    return { status: "active", course };
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold" style={{ color: BRAND.navy }}>Level progression</h3>
        <span
          className="text-xs font-medium px-2.5 py-1 rounded-full"
          style={{ backgroundColor: BRAND.redSoft, color: BRAND.red }}
        >
          Currently on {currentLevel}
        </span>
      </div>

      <div className="flex items-start overflow-x-auto pb-1 -mx-1 px-1">
        {sortedLevels.map((level, idx) => {
          const { status, course } = getNodeState(level);
          const isLast = idx === sortedLevels.length - 1;
          const isCompleted = status === "completed";
          const isActive = status === "active";
          const isInteractive = Boolean(course) && !course.isLocked;

          const nodeStyle = isCompleted
            ? { backgroundColor: BRAND.navy, borderColor: BRAND.navy, color: "#fff" }
            : isActive
            ? { backgroundColor: "#fff", borderColor: BRAND.red, color: BRAND.red, boxShadow: `0 0 0 3px ${BRAND.redSoft}` }
            : { backgroundColor: "#f8fafc", borderColor: "#e2e8f0", color: "#94a3b8" };

          return (
            <React.Fragment key={level.name}>
              <button
                type="button"
                disabled={!isInteractive}
                onClick={() => isInteractive && onSelectCourse?.(course.id)}
                className={`flex flex-col items-center gap-2 shrink-0 w-24 sm:w-32 ${
                  isInteractive ? "cursor-pointer" : "cursor-not-allowed"
                }`}
              >
                <span
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border flex items-center justify-center text-xs font-medium"
                  style={nodeStyle}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : status === "locked" ? (
                    <Lock className="w-3.5 h-3.5" />
                  ) : (
                    idx + 1
                  )}
                </span>
                <div className="text-center min-w-0 w-full">
                  <p
                    className="text-xs sm:text-sm font-medium truncate"
                    style={{ color: status === "locked" || status === "unassigned" ? "#94a3b8" : BRAND.navy }}
                  >
                    {level.name}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {course ? course.title : "Not assigned"}
                  </p>
                  {isInteractive && (
                    <p className="text-[11px] font-medium mt-0.5" style={{ color: BRAND.blue }}>
                      {course.progressPercentage}%
                    </p>
                  )}
                </div>
              </button>

              {!isLast && (
                <div
                  className="h-px mt-4 sm:mt-[18px] flex-1 min-w-[12px] sm:min-w-[20px]"
                  style={{ backgroundColor: isCompleted ? BRAND.navy : "#e2e8f0" }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default StudentLevelRoadmap;
