import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  Clock,
  Lock,
} from "lucide-react";
import { toast } from "sonner";

import SkillLevelCircle from "@/components/common/SkillLevelCircle";

export const LevelEditor = ({
  levels = [],
  onChange,
  lockedLevels = [],
  readOnly = false,
}) => {
  // Add new level
  const handleAddLevel = () => {
    const newOrder = levels.length;
    const newLevels = [
      ...levels,
      {
        name: `L${newOrder + 1}`,
        order: newOrder,
        completionTimeframe: { minDays: 1, maxDays: 5 },
        description: "",
        color: "#3B82F6",
      },
    ];
    onChange(newLevels);
  };

  // Remove level
  const handleRemoveLevel = (index) => {
    if (levels.length === 1) {
      toast.error("At least one level is required");
      return;
    }

    const levelToRemove = levels[index];
    if (
      lockedLevels.length > 0 &&
      lockedLevels.map((l) => l.toUpperCase()).includes(levelToRemove.name.toUpperCase())
    ) {
      toast.error(`Level ${levelToRemove.name} is in use and cannot be removed`);
      return;
    }

    const newLevels = levels.filter((_, i) => i !== index);
    const reorderedLevels = newLevels.map((level, i) => ({ ...level, order: i }));
    onChange(reorderedLevels);
  };

  // Move level up
  const handleMoveUp = (index) => {
    if (index === 0) return;
    const newLevels = [...levels];
    [newLevels[index - 1], newLevels[index]] = [newLevels[index], newLevels[index - 1]];
    const reorderedLevels = newLevels.map((level, i) => ({ ...level, order: i }));
    onChange(reorderedLevels);
  };

  // Move level down
  const handleMoveDown = (index) => {
    if (index === levels.length - 1) return;
    const newLevels = [...levels];
    [newLevels[index], newLevels[index + 1]] = [newLevels[index + 1], newLevels[index]];
    const reorderedLevels = newLevels.map((level, i) => ({ ...level, order: i }));
    onChange(reorderedLevels);
  };

  // Update level field
  const handleLevelChange = (index, field, value) => {
    const newLevels = levels.map((lvl, i) => {
      if (i !== index) return lvl;
      if (field.includes(".")) {
        const [parent, child] = field.split(".");
        return {
          ...lvl,
          [parent]: {
            ...lvl[parent],
            [child]: parseInt(value) || 0,
          },
        };
      }
      return { ...lvl, [field]: value };
    });
    onChange(newLevels);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-[#1f2937]">Configured Levels ({levels.length})</h4>
          <p className="text-xs text-[#6b7280]">
            Define progression order, completion timeframes, and badges
          </p>
        </div>
        {!readOnly && (
          <Button size="sm" variant="outline" onClick={handleAddLevel}>
            <Plus className="h-4 w-4 mr-1" />
            Add Level
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {levels.map((level, index) => {
          const isLocked =
            lockedLevels.length > 0 &&
            lockedLevels.map((l) => l.toUpperCase()).includes((level.name || "").toUpperCase());

          return (
            <Card key={index} className="bg-[#f8fafc] border border-[#e2e8f0]">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Order Controls */}
                  {!readOnly && (
                    <div className="flex flex-col gap-1 items-center justify-center pt-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-[#64748b] hover:text-[#0f172a]"
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0}
                        title="Move Up"
                      >
                        <MoveUp className="h-4 w-4" />
                      </Button>
                      <span className="text-xs font-bold text-[#475569]">{index + 1}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-[#64748b] hover:text-[#0f172a]"
                        onClick={() => handleMoveDown(index)}
                        disabled={index === levels.length - 1}
                        title="Move Down"
                      >
                        <MoveDown className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  {/* Level Input Fields */}
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <SkillLevelCircle levelIndex={index} levels={levels} size={17} />
                        <Label className="text-xs font-semibold text-[#374151]">Level Name*</Label>
                        {isLocked && (
                          <Badge variant="outline" className="text-[10px] text-[#b45309] bg-[#fef3c7] border-[#fde68a] px-1 py-0 flex items-center gap-0.5">
                            <Lock className="h-2.5 w-2.5" /> In Use
                          </Badge>
                        )}
                      </div>
                      <Input
                        value={level.name}
                        disabled={readOnly || isLocked}
                        onChange={(e) => handleLevelChange(index, "name", e.target.value)}
                        placeholder="e.g., L1, L2"
                        className="h-9 text-sm"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-[#374151]">Min Days*</Label>
                      <Input
                        type="number"
                        min="0"
                        disabled={readOnly}
                        value={level.completionTimeframe?.minDays ?? 0}
                        onChange={(e) =>
                          handleLevelChange(index, "completionTimeframe.minDays", e.target.value)
                        }
                        className="h-9 text-sm"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-[#374151]">Max Days*</Label>
                      <Input
                        type="number"
                        min="0"
                        disabled={readOnly}
                        value={level.completionTimeframe?.maxDays ?? 0}
                        onChange={(e) =>
                          handleLevelChange(index, "completionTimeframe.maxDays", e.target.value)
                        }
                        className="h-9 text-sm"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-[#374151]">Badge Color</Label>
                      <div className="flex gap-2 items-center">
                        <Input
                          type="color"
                          disabled={readOnly}
                          value={level.color || "#3B82F6"}
                          onChange={(e) => handleLevelChange(index, "color", e.target.value)}
                          className="w-10 h-9 p-0.5 cursor-pointer"
                        />
                        <Input
                          disabled={readOnly}
                          value={level.color || "#3B82F6"}
                          onChange={(e) => handleLevelChange(index, "color", e.target.value)}
                          placeholder="#3B82F6"
                          className="flex-1 h-9 text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-1 md:col-span-2 lg:col-span-3">
                      <Label className="text-xs font-medium text-[#374151]">Description</Label>
                      <Input
                        disabled={readOnly}
                        value={level.description || ""}
                        onChange={(e) => handleLevelChange(index, "description", e.target.value)}
                        placeholder="e.g. Beginner / Operator Level"
                        className="h-9 text-sm"
                      />
                    </div>

                    <div className="flex items-end pb-0.5">
                      <div className="flex items-center gap-1.5 text-xs text-[#64748b]">
                        <Clock className="h-3.5 w-3.5 text-[#3b82f6]" />
                        <span>
                          {level.completionTimeframe?.minDays || 0} – {level.completionTimeframe?.maxDays || 0} days
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Remove Button */}
                  {!readOnly && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleRemoveLevel(index)}
                      disabled={levels.length === 1 || isLocked}
                      className="text-[#dc2626] hover:text-[#b91c1c] hover:bg-[#fef2f2] h-8 w-8 self-center"
                      title={isLocked ? "Cannot remove in-use level" : "Delete Level"}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default LevelEditor;
