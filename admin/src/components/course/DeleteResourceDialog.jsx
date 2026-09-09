import React from "react";
import { createPortal } from "react-dom";
import { IconTrash, IconLoader, IconAlertTriangle } from "@tabler/icons-react";

export const DeleteResourceDialog = ({ open, resourceTitle, isDeleting, onConfirm, onCancel }) => {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => !isDeleting && onCancel()}
      />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 text-center space-y-4">
        <div className="mx-auto h-14 w-14 rounded-full bg-[#fef2f2] flex items-center justify-center">
          <IconAlertTriangle className="h-7 w-7 text-[#dc2626]" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-[#111827]">Delete Resource</h3>
          <p className="text-sm text-[#6b7280] mt-1">
            {isDeleting ? (
              "Deleting resource..."
            ) : (
              <>
                Are you sure you want to delete
                {resourceTitle ? (
                  <span className="font-medium text-[#111827]"> "{resourceTitle}"</span>
                ) : (
                  " this resource"
                )}
                ? This action cannot be undone.
              </>
            )}
          </p>
        </div>
        <div className="flex gap-3 justify-center pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2 rounded-md border border-[#d1d5db] text-sm font-medium text-[#374151] hover:bg-[#f9fafb] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 rounded-md bg-[#dc2626] text-white text-sm font-medium hover:bg-[#b91c1c] disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {isDeleting ? (
              <>
                <IconLoader className="h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <IconTrash className="h-4 w-4" />
                Delete
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default DeleteResourceDialog;
