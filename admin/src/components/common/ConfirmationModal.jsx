import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Trash2, RotateCcw } from "lucide-react";
import useTranslate from "@/hooks/useTranslate";

const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText,
  cancelText,
  type = "warning", // warning, danger, info
  isLoading = false,
}) => {
  const { t } = useTranslate();
  const getIcon = () => {
    switch (type) {
      case "danger":
        return <Trash2 className="w-6 h-6 text-[#dc2626]" />;
      case "restore":
        return <RotateCcw className="w-6 h-6 text-[#16a34a]" />;
      default:
        return <AlertTriangle className="w-6 h-6 text-[#ca8a04]" />;
    }
  };

  const getConfirmButtonClass = () => {
    switch (type) {
      case "danger":
        return "bg-[#dc2626] hover:bg-[#b91c1c] text-white";
      case "restore":
        return "bg-[#16a34a] hover:bg-[#15803d] text-white";
      default:
        return "bg-[#ca8a04] hover:bg-[#a16207] text-white";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            {getIcon()}
            <DialogTitle className="text-lg font-semibold">
              {title || t('dialog.confirmTitle')}
            </DialogTitle>
          </div>
          <DialogDescription className="text-[#4b5563]">
            {description || t('dialog.confirmMessage')}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2 pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="min-w-[80px]"
          >
            {cancelText || t('dialog.cancel')}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className={`min-w-[80px] ${getConfirmButtonClass()}`}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>{t('ui.loading')}</span>
              </div>
            ) : (
              confirmText || t('dialog.confirm')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmationModal;
