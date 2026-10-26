import React, { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Layers,
  Settings,
  RotateCcw,
  Edit3,
  Search,
  Building,
  FolderTree,
  AlertCircle,
  Save,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  useGetHierarchyMatrixQuery,
  useCreateConfigMutation,
  useUpdateConfigMutation,
  useDeleteScopeOverrideMutation,
} from "@/Redux/AllApi/CourseLevelConfigApi";
import LevelEditor from "@/components/admin/LevelEditor";
import SkillLevelCircle, { getLevelIndex } from "@/components/common/SkillLevelCircle";

const CourseLevelConfig = () => {
  // Queries & Mutations
  const { data: matrixData, isLoading, refetch } = useGetHierarchyMatrixQuery();
  const [createConfig, { isLoading: isSaving }] = useCreateConfigMutation();
  const [updateConfig, { isLoading: isUpdating }] = useUpdateConfigMutation();
  const [deleteScopeOverride, { isLoading: isDeletingOverride }] = useDeleteScopeOverrideMutation();

  const matrix = matrixData?.data || { global: null, units: [], departments: [] };
  const globalConfig = matrix.global;
  const globalLevels = globalConfig?.levels || [];

  // Filter & Search State
  const [activeTab, setActiveTab] = useState("ALL"); // ALL | UNITS | DEPARTMENTS | OVERRIDES
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUnitFilter, setSelectedUnitFilter] = useState("ALL");

  // Modal State for Editing Scope
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTarget, setActiveTarget] = useState(null); // { type: 'GLOBAL' | 'UNIT' | 'DEPARTMENT', unit, departmentId, departmentName, config }
  const [modalConfigName, setModalConfigName] = useState("");
  const [modalLevels, setModalLevels] = useState([]);
  const [modalDescription, setModalDescription] = useState("");

  // Revert Confirmation Modal
  const [revertTarget, setRevertTarget] = useState(null);
  const [isRevertOpen, setIsRevertOpen] = useState(false);

  // Open editor for a specific target
  const handleOpenEditor = (target) => {
    setActiveTarget(target);
    const existingLevels = target.config?.levels || globalLevels || [
      { name: "L1", order: 0, completionTimeframe: { minDays: 1, maxDays: 4 }, description: "Beginner", color: "#3B82F6" },
      { name: "L2", order: 1, completionTimeframe: { minDays: 5, maxDays: 8 }, description: "Intermediate", color: "#F97316" },
      { name: "L3", order: 2, completionTimeframe: { minDays: 9, maxDays: 12 }, description: "Advanced", color: "#10B981" },
    ];

    setModalLevels(JSON.parse(JSON.stringify(existingLevels)));

    let defaultName = "";
    if (target.type === "GLOBAL") {
      defaultName = target.config?.name || "Global Standard Configuration";
    } else if (target.type === "UNIT") {
      defaultName = `${target.unit} Standard Levels`;
    } else if (target.type === "DEPARTMENT") {
      defaultName = `${target.departmentName} (${target.unit || "General"}) Levels`;
    }
    setModalConfigName(target.config?.name || defaultName);
    setModalDescription(target.config?.description || "");
    setIsModalOpen(true);
  };

  // Prefill shortcuts
  const handleCopyFromGlobal = () => {
    if (!globalLevels.length) return;
    setModalLevels(JSON.parse(JSON.stringify(globalLevels)));
    toast.info("Copied levels from Global Standard");
  };

  const handleCopyFromUnit = () => {
    if (!activeTarget?.unit) return;
    const parentUnitItem = matrix.units.find(
      (u) => u.unit.toUpperCase() === activeTarget.unit.toUpperCase()
    );
    const sourceLevels = parentUnitItem?.config?.levels || globalLevels;
    if (sourceLevels) {
      setModalLevels(JSON.parse(JSON.stringify(sourceLevels)));
      toast.info(`Copied levels from ${activeTarget.unit} configuration`);
    }
  };

  // Save handler
  const handleSaveConfig = async () => {
    if (!modalConfigName.trim()) {
      toast.error("Configuration name is required");
      return;
    }
    if (!modalLevels || modalLevels.length === 0) {
      toast.error("At least one level is required");
      return;
    }

    const names = modalLevels.map((l) => (l.name || "").trim().toUpperCase());
    if (new Set(names).size !== names.length) {
      toast.error("Level names must be unique");
      return;
    }

    for (let i = 0; i < modalLevels.length; i++) {
      const l = modalLevels[i];
      if (!l.name?.trim()) {
        toast.error(`Level ${i + 1} must have a name`);
        return;
      }
      if (l.completionTimeframe?.minDays > l.completionTimeframe?.maxDays) {
        toast.error(`Level ${l.name}: Min days cannot exceed Max days`);
        return;
      }
    }

    try {
      if (activeTarget.type === "GLOBAL") {
        if (activeTarget.config?.id || activeTarget.config?._id) {
          await updateConfig({
            id: activeTarget.config.id || activeTarget.config._id,
            name: modalConfigName,
            description: modalDescription,
            levels: modalLevels,
            isDefault: true,
            scopeType: "GLOBAL",
          }).unwrap();
          toast.success("Global standard levels updated successfully");
        } else {
          await createConfig({
            name: modalConfigName,
            description: modalDescription,
            levels: modalLevels,
            isDefault: true,
            scopeType: "GLOBAL",
          }).unwrap();
          toast.success("Global standard levels created successfully");
        }
      } else {
        await createConfig({
          name: modalConfigName,
          description: modalDescription,
          levels: modalLevels,
          scopeType: activeTarget.type,
          unit: activeTarget.unit || null,
          departmentId: activeTarget.departmentId || null,
          departmentName: activeTarget.departmentName || null,
        }).unwrap();
        toast.success(
          `Custom override saved for ${activeTarget.departmentName || activeTarget.unit}`
        );
      }

      setIsModalOpen(false);
      refetch();
    } catch (error) {
      console.error("Save config error:", error);
      toast.error(error.data?.message || "Failed to save configuration");
    }
  };

  // Revert Override Handler
  const handleConfirmRevert = async () => {
    if (!revertTarget) return;

    try {
      await deleteScopeOverride({
        scopeType: revertTarget.type,
        unit: revertTarget.unit,
        departmentId: revertTarget.departmentId,
      }).unwrap();

      toast.success("Custom override removed. Reverted to inherited configuration.");
      setIsRevertOpen(false);
      setRevertTarget(null);
      refetch();
    } catch (error) {
      console.error("Revert override error:", error);
      toast.error(error.data?.message || "Failed to revert override");
    }
  };

  // Calculations for Scope Tab Counts
  const totalUnits = matrix.units?.length || 0;
  const unitOverrides = matrix.units?.filter((u) => u.hasOverride)?.length || 0;
  const totalDepartments = matrix.departments?.length || 0;
  const deptOverrides = matrix.departments?.filter((d) => d.hasOverride)?.length || 0;
  const totalOverrides = unitOverrides + deptOverrides;
  const totalAll = totalUnits + totalDepartments;

  // Filter logic
  const filteredUnits = useMemo(() => {
    if (activeTab === "DEPARTMENTS") return [];
    return (matrix.units || []).filter((u) => {
      if (activeTab === "OVERRIDES" && !u.hasOverride) return false;
      if (selectedUnitFilter !== "ALL" && u.unit.toUpperCase() !== selectedUnitFilter.toUpperCase()) {
        return false;
      }
      if (searchQuery.trim()) {
        return u.unit.toLowerCase().includes(searchQuery.toLowerCase());
      }
      return true;
    });
  }, [matrix.units, activeTab, selectedUnitFilter, searchQuery]);

  const filteredDepartments = useMemo(() => {
    if (activeTab === "UNITS") return [];
    return (matrix.departments || []).filter((d) => {
      if (activeTab === "OVERRIDES" && !d.hasOverride) return false;
      if (selectedUnitFilter !== "ALL") {
        if (!d.unit || d.unit.toUpperCase() !== selectedUnitFilter.toUpperCase()) {
          return false;
        }
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const deptMatch = (d.departmentName || "").toLowerCase().includes(query);
        const unitMatch = (d.unit || "").toLowerCase().includes(query);
        return deptMatch || unitMatch;
      }
      return true;
    });
  }, [matrix.departments, activeTab, selectedUnitFilter, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] space-y-3">
        <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-[#2563eb]"></div>
        <p className="text-xs text-[#64748b]">Loading Course Level Governance Matrix...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-xl border border-[#e2e8f0] shadow-sm">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#0f172a] flex items-center gap-2">
            <Layers className="h-5 w-5 text-[#9333ea]" />
            Course Level Configuration
          </h2>
          <p className="text-xs text-[#64748b] mt-0.5">
            Decide skill levels globally, per manufacturing unit, and per department with Lean Skill Matrix circle symbols.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="h-8 text-xs flex items-center gap-1 text-[#475569]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Refresh
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs bg-gradient-to-r from-[#9333ea] to-[#2563eb] text-white hover:opacity-90 flex items-center gap-1.5 shadow-sm"
            onClick={() =>
              handleOpenEditor({
                type: "GLOBAL",
                config: globalConfig,
              })
            }
          >
            <Edit3 className="h-3.5 w-3.5" />
            Edit Global Standard
          </Button>
        </div>
      </div>

      {/* 2. Skill Matrix Global Standard Legend Strip */}
      <div className="bg-white px-4 py-3 rounded-xl border border-[#e2e8f0] shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#475569]">
            Global Standard:
          </span>
          <span className="text-xs text-[#64748b] hidden lg:inline">
            ({globalConfig?.name || "Default 3-Level"})
          </span>
        </div>

        {/* Legend pills showing circle Harvey balls */}
        <div className="flex flex-wrap items-center gap-2">
          {globalLevels.map((lvl, idx) => (
            <div
              key={lvl.name || idx}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#f8fafc] border border-[#e2e8f0] text-xs text-[#1e293b]"
              title={`${lvl.name}: ${lvl.completionTimeframe?.minDays || 0} - ${lvl.completionTimeframe?.maxDays || 0} days ${lvl.description ? `• ${lvl.description}` : ""}`}
            >
              <SkillLevelCircle
                levelIndex={idx}
                levels={globalLevels}
                size={17}
              />
              <span className="font-semibold">{lvl.name}</span>
              <span className="text-[11px] text-[#64748b]">
                {lvl.completionTimeframe?.minDays}-{lvl.completionTimeframe?.maxDays}d
              </span>
              {lvl.color && (
                <span
                  className="w-2 h-2 rounded-full inline-block"
                  style={{ backgroundColor: lvl.color }}
                  title={`Color: ${lvl.color}`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 3. Scope Tabs & Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Scope Tabs */}
        <div className="flex items-center gap-1 bg-[#f1f5f9] p-1 rounded-lg w-fit">
          <button
            type="button"
            onClick={() => setActiveTab("ALL")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === "ALL"
                ? "bg-white text-[#0f172a] shadow-sm"
                : "text-[#64748b] hover:text-[#0f172a]"
            }`}
          >
            All Overview ({totalAll})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("UNITS")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === "UNITS"
                ? "bg-white text-[#0f172a] shadow-sm"
                : "text-[#64748b] hover:text-[#0f172a]"
            }`}
          >
            Units ({totalUnits})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("DEPARTMENTS")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === "DEPARTMENTS"
                ? "bg-white text-[#0f172a] shadow-sm"
                : "text-[#64748b] hover:text-[#0f172a]"
            }`}
          >
            Departments ({totalDepartments})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("OVERRIDES")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === "OVERRIDES"
                ? "bg-[#10b981] text-white shadow-sm"
                : "text-[#059669] hover:bg-[#d1fae5]"
            }`}
          >
            Custom Overrides ({totalOverrides})
          </button>
        </div>

        {/* Search & Unit Filter */}
        <div className="flex items-center gap-2">
          <div className="relative w-48 sm:w-56">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#94a3b8]" />
            <Input
              placeholder="Search unit or dept..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs bg-white"
            />
          </div>

          <select
            value={selectedUnitFilter}
            onChange={(e) => setSelectedUnitFilter(e.target.value)}
            className="h-8 px-2.5 rounded-md border border-[#e2e8f0] bg-white text-xs text-[#334155] focus:outline-none focus:ring-1 focus:ring-[#9333ea]"
          >
            <option value="ALL">All Units</option>
            {matrix.units.map((u) => (
              <option key={u.unit} value={u.unit}>
                {u.unit}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 4. Governance Matrix Table */}
      <Card className="border border-[#e2e8f0] shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-[#f8fafc]">
            <TableRow className="border-b border-[#e2e8f0]">
              <TableHead className="w-1/4 text-xs font-bold text-[#475569] uppercase">
                Entity Name
              </TableHead>
              <TableHead className="w-1/6 text-xs font-bold text-[#475569] uppercase">
                Scope Source
              </TableHead>
              <TableHead className="w-2/5 text-xs font-bold text-[#475569] uppercase">
                Level Symbols (Skill Matrix Sheet Format)
              </TableHead>
              <TableHead className="w-1/6 text-xs font-bold text-[#475569] uppercase text-right pr-4">
                Action
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-[#f1f5f9]">
            {/* Units Rows */}
            {filteredUnits.length > 0 && (
              <>
                <TableRow className="bg-[#faf5ff]/40">
                  <TableCell
                    colSpan={4}
                    className="py-1.5 px-4 text-[11px] font-bold text-[#7e22ce] uppercase tracking-wider"
                  >
                    Manufacturing Units ({filteredUnits.length})
                  </TableCell>
                </TableRow>
                {filteredUnits.map((unitItem) => {
                  const unitLevels = unitItem.config?.levels || globalLevels;

                  return (
                    <TableRow key={`unit-${unitItem.unit}`} className="hover:bg-[#f8fafc]/80 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-[#9333ea]" />
                          <span className="font-semibold text-sm text-[#0f172a]">
                            {unitItem.unit}
                          </span>
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-[#f1f5f9] text-[#64748b]">
                            Unit
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {unitItem.hasOverride ? (
                          <Badge className="bg-[#dcfce7] text-[#166534] hover:bg-[#bbf7d0] text-xs font-semibold flex items-center gap-1 w-fit border border-[#86efac]">
                            <Sparkles className="h-3 w-3" />
                            Custom Override
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[#64748b] bg-[#f8fafc] text-xs font-medium w-fit">
                            Inherited (Global)
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {unitLevels.map((lvl, idx) => (
                            <div
                              key={lvl.name || idx}
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white border border-[#e2e8f0] text-xs text-[#1e293b] shadow-2xs cursor-help"
                              title={`${lvl.name}: ${lvl.completionTimeframe?.minDays || 0} - ${lvl.completionTimeframe?.maxDays || 0} days ${lvl.description ? `• ${lvl.description}` : ""}`}
                            >
                              <SkillLevelCircle
                                levelIndex={idx}
                                levels={unitLevels}
                                size={16}
                              />
                              <span className="font-semibold text-xs">{lvl.name}</span>
                              <span className="text-[10px] text-[#64748b]">
                                {lvl.completionTimeframe?.minDays}-{lvl.completionTimeframe?.maxDays}d
                              </span>
                              {lvl.color && (
                                <span
                                  className="w-1.5 h-1.5 rounded-full inline-block"
                                  style={{ backgroundColor: lvl.color }}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs px-2.5 text-[#2563eb] border-[#bfdbfe] hover:bg-[#eff6ff]"
                            onClick={() =>
                              handleOpenEditor({
                                type: "UNIT",
                                unit: unitItem.unit,
                                config: unitItem.config,
                              })
                            }
                          >
                            <Edit3 className="h-3 w-3 mr-1" />
                            {unitItem.hasOverride ? "Edit" : "Override"}
                          </Button>
                          {unitItem.hasOverride && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs px-2 text-[#dc2626] hover:bg-[#fef2f2]"
                              onClick={() => {
                                setRevertTarget({
                                  type: "UNIT",
                                  unit: unitItem.unit,
                                  name: unitItem.unit,
                                });
                                setIsRevertOpen(true);
                              }}
                              title="Revert to Global Standard"
                            >
                              <RotateCcw className="h-3 w-3 mr-1" />
                              Revert
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </>
            )}

            {/* Department Rows */}
            {filteredDepartments.length > 0 && (
              <>
                <TableRow className="bg-[#f0fdf4]/50">
                  <TableCell
                    colSpan={4}
                    className="py-1.5 px-4 text-[11px] font-bold text-[#15803d] uppercase tracking-wider"
                  >
                    Department Level Overrides ({filteredDepartments.length})
                  </TableCell>
                </TableRow>
                {filteredDepartments.map((dept) => {
                  const deptLevels = dept.config?.levels || globalLevels;

                  return (
                    <TableRow key={`dept-${dept.departmentId}`} className="hover:bg-[#f8fafc]/80 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FolderTree className="h-4 w-4 text-[#10b981]" />
                          <div>
                            <span className="font-semibold text-sm text-[#0f172a]">
                              {dept.departmentName}
                            </span>
                            {dept.unit && (
                              <span className="ml-2 text-[10px] font-semibold text-[#475569] bg-[#f1f5f9] px-1.5 py-0.5 rounded">
                                {dept.unit}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {dept.hasOverride ? (
                          <Badge className="bg-[#dcfce7] text-[#166534] hover:bg-[#bbf7d0] text-xs font-semibold flex items-center gap-1 w-fit border border-[#86efac]">
                            <Sparkles className="h-3 w-3" />
                            Custom Override
                          </Badge>
                        ) : dept.source === "UNIT" ? (
                          <Badge variant="outline" className="text-[#6b21a8] bg-[#faf5ff] border-[#e9d5ff] text-xs font-medium w-fit">
                            Inherited ({dept.unit})
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[#64748b] bg-[#f8fafc] text-xs font-medium w-fit">
                            Inherited (Global)
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {deptLevels.map((lvl, idx) => (
                            <div
                              key={lvl.name || idx}
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white border border-[#e2e8f0] text-xs text-[#1e293b] shadow-2xs cursor-help"
                              title={`${lvl.name}: ${lvl.completionTimeframe?.minDays || 0} - ${lvl.completionTimeframe?.maxDays || 0} days ${lvl.description ? `• ${lvl.description}` : ""}`}
                            >
                              <SkillLevelCircle
                                levelIndex={idx}
                                levels={deptLevels}
                                size={16}
                              />
                              <span className="font-semibold text-xs">{lvl.name}</span>
                              <span className="text-[10px] text-[#64748b]">
                                {lvl.completionTimeframe?.minDays}-{lvl.completionTimeframe?.maxDays}d
                              </span>
                              {lvl.color && (
                                <span
                                  className="w-1.5 h-1.5 rounded-full inline-block"
                                  style={{ backgroundColor: lvl.color }}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs px-2.5 text-[#16a34a] border-[#bbf7d0] hover:bg-[#f0fdf4]"
                            onClick={() =>
                              handleOpenEditor({
                                type: "DEPARTMENT",
                                departmentId: dept.departmentId,
                                departmentName: dept.departmentName,
                                unit: dept.unit,
                                config: dept.config,
                              })
                            }
                          >
                            <Edit3 className="h-3 w-3 mr-1" />
                            {dept.hasOverride ? "Edit" : "Override"}
                          </Button>
                          {dept.hasOverride && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs px-2 text-[#dc2626] hover:bg-[#fef2f2]"
                              onClick={() => {
                                setRevertTarget({
                                  type: "DEPARTMENT",
                                  departmentId: dept.departmentId,
                                  name: `${dept.departmentName} (${dept.unit || "General"})`,
                                });
                                setIsRevertOpen(true);
                              }}
                              title="Revert to Parent Inheritance"
                            >
                              <RotateCcw className="h-3 w-3 mr-1" />
                              Revert
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </>
            )}

            {filteredUnits.length === 0 && filteredDepartments.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-xs text-[#94a3b8]">
                  No matching units or departments found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* 5. Shared Override & Configuration Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg text-[#0f172a]">
              <Settings className="h-5 w-5 text-[#9333ea]" />
              {activeTarget?.type === "GLOBAL"
                ? "Edit Global Standard Levels"
                : `Configure Custom Level Override: ${activeTarget?.departmentName || activeTarget?.unit}`}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {activeTarget?.type === "GLOBAL"
                ? "This configuration serves as the organization-wide baseline. Any unit or department without an override will inherit these levels."
                : `Define specialized levels and completion timeframes for ${activeTarget?.departmentName || activeTarget?.unit}.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Quick Prefill Actions */}
            {activeTarget?.type !== "GLOBAL" && (
              <div className="bg-[#f8fafc] border border-[#e2e8f0] p-2.5 rounded-lg flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-[#64748b]">
                  Copy template levels from:
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs bg-white"
                    onClick={handleCopyFromGlobal}
                  >
                    Global Standard
                  </Button>
                  {activeTarget?.type === "DEPARTMENT" && activeTarget?.unit && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs bg-white"
                      onClick={handleCopyFromUnit}
                    >
                      {activeTarget.unit} Levels
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-[#374151]">Configuration Name*</Label>
                <Input
                  value={modalConfigName}
                  onChange={(e) => setModalConfigName(e.target.value)}
                  placeholder="e.g., Standard Levels"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-[#374151]">Scope Target</Label>
                <div className="h-9 px-3 flex items-center bg-[#f1f5f9] rounded-md text-xs font-medium text-[#475569]">
                  {activeTarget?.type === "GLOBAL"
                    ? "GLOBAL (System-wide default)"
                    : activeTarget?.type === "UNIT"
                    ? `UNIT: ${activeTarget?.unit}`
                    : `DEPARTMENT: ${activeTarget?.departmentName} (${activeTarget?.unit || "General"})`}
                </div>
              </div>
            </div>

            {/* Reusable Level Editor with Live SkillLevelCircle Preview */}
            <LevelEditor levels={modalLevels} onChange={setModalLevels} />
          </div>

          <DialogFooter className="border-t border-[#e2e8f0] pt-3 mt-2">
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-gradient-to-r from-[#9333ea] to-[#2563eb] text-white hover:opacity-90"
              onClick={handleSaveConfig}
              disabled={isSaving || isUpdating}
            >
              <Save className="h-3.5 w-3.5 mr-1.5" />
              {isSaving || isUpdating ? "Saving..." : "Save Configuration"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 6. Confirmation Dialog: Revert Override */}
      <Dialog open={isRevertOpen} onOpenChange={setIsRevertOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base text-[#b91c1c] flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Confirm Override Removal
            </DialogTitle>
            <DialogDescription className="text-xs pt-1.5 leading-relaxed">
              Are you sure you want to remove the custom level override for{" "}
              <strong>{revertTarget?.name}</strong>?
              <br />
              <br />
              It will immediately revert to inheriting from its parent scope (
              {revertTarget?.type === "DEPARTMENT" ? "Unit or Global Standard" : "Global Standard"}
              ). No student progress records will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-3">
            <Button variant="outline" size="sm" onClick={() => setIsRevertOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmRevert}
              disabled={isDeletingOverride}
            >
              {isDeletingOverride ? "Reverting..." : "Revert Override"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CourseLevelConfig;
