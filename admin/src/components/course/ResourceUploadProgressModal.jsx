import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconCheck, IconAlertTriangle } from "@tabler/icons-react";
import { getResourceIcon } from "@/utils/resourceConfig";
import { cn } from "@/lib/utils";

const formatBytes = (bytes) => {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const formatSeconds = (totalSeconds) => {
  const s = Math.max(0, Math.round(totalSeconds));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
};

const STAGES = [
  { upTo: 15, label: "Preparing file..." },
  { upTo: 90, label: "Uploading to cloud storage..." },
  { upTo: 99, label: "Registering resource in database..." },
];

const getStageLabel = (progress) => {
  const stage = STAGES.find((s) => progress <= s.upTo);
  return stage ? stage.label : "Finalizing resource...";
};

/**
 * Real upload progress isn't available from the API layer (no onUploadProgress
 * wiring), so this simulates a plausible curve sized off the file: it eases
 * toward 95% and only reaches 100% once the caller reports success.
 */
export const ResourceUploadProgressModal = ({
  open,
  file,
  resourceType,
  status = "uploading", // "uploading" | "success" | "error"
  errorMessage,
  onClose,
}) => {
  const [progress, setProgress] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const progressIntervalRef = useRef(null);
  const elapsedIntervalRef = useRef(null);

  const estimatedTotal = file
    ? Math.min(45, Math.max(4, (file.size / (1024 * 1024)) * 1.5))
    : 6;

  useEffect(() => {
    if (!open) {
      setProgress(0);
      setElapsedSeconds(0);
      return undefined;
    }

    if (status !== "uploading") {
      return undefined;
    }

    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return prev;
        const remaining = 95 - prev;
        const step = Math.max(0.5, remaining * 0.08);
        return Math.min(95, prev + step);
      });
    }, 200);

    elapsedIntervalRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(progressIntervalRef.current);
      clearInterval(elapsedIntervalRef.current);
    };
  }, [open, status]);

  useEffect(() => {
    if (status === "success") {
      clearInterval(progressIntervalRef.current);
      clearInterval(elapsedIntervalRef.current);
      setProgress(100);
    } else if (status === "error") {
      clearInterval(progressIntervalRef.current);
      clearInterval(elapsedIntervalRef.current);
    }
  }, [status]);

  if (!open) return null;

  const remainingSeconds = Math.max(0, estimatedTotal - elapsedSeconds);
  const Icon = getResourceIcon(resourceType);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
        {status === "error" ? (
          <div className="text-center space-y-4">
            <div className="mx-auto h-14 w-14 rounded-full bg-[#fef2f2] flex items-center justify-center">
              <IconAlertTriangle className="h-7 w-7 text-[#dc2626]" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#111827]">Upload Failed</h3>
              <p className="text-sm text-[#6b7280] mt-1">
                {errorMessage || "Something went wrong while uploading."}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 px-4 py-2 rounded-md bg-[#111827] text-white text-sm font-medium hover:bg-[#1f2937]"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-[#111827]">
                {status === "success" ? "Upload Complete" : "Uploading Resource"}
              </h3>
              <p className="text-sm text-[#6b7280] mt-1">
                {status === "success" ? "Your resource has been saved." : getStageLabel(progress)}
              </p>
            </div>

            {file && (
              <div className="flex items-center gap-3 bg-[#f9fafb] border border-[#e5e7eb] rounded-lg p-3">
                <div className="p-2 bg-white rounded-md border border-[#e5e7eb]">
                  <Icon className="h-5 w-5 text-[#4b5563]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#111827] truncate">{file.name}</p>
                  <p className="text-xs text-[#6b7280]">{formatBytes(file.size)}</p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <div className="h-2.5 w-full bg-[#e5e7eb] rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-300 ease-out",
                    status === "success" ? "bg-[#16a34a]" : "bg-[#2563eb]"
                  )}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-[#6b7280]">
                <span>Elapsed {formatSeconds(elapsedSeconds)}</span>
                <span>{Math.round(progress)}%</span>
                <span>{status === "success" ? "Done" : `Est. ${formatSeconds(remainingSeconds)} left`}</span>
              </div>
            </div>

            {status === "success" && (
              <div className="flex items-center justify-center gap-2 text-[#16a34a]">
                <IconCheck className="h-5 w-5" />
                <span className="text-sm font-medium">Success!</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default ResourceUploadProgressModal;
