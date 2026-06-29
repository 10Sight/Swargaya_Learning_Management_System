import React, { useState, useMemo } from "react";
import {
    IconBuilding,
    IconPlus,
    IconSearch,
    IconEdit,
    IconTrash,
    IconX,
    IconLoader,
    IconMapPin,
    IconUser,
    IconPhone,
    IconAlertTriangle,
} from "@tabler/icons-react";
import { toast } from "sonner";
import {
    useGetAllUnitsQuery,
    useCreateUnitMutation,
    useUpdateUnitMutation,
    useDeleteUnitMutation,
} from "@/Redux/AllApi/UnitApi";

// ─── Shared Modal Shell ───────────────────────────────────────────────────────
const Modal = ({ title, onClose, children }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
        />
        <div
            className="relative w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
            style={{
                background: "rgba(255,255,255,0.97)",
                border: "1px solid rgba(147,51,234,0.15)",
            }}
        >
            {/* Header */}
            <div
                className="flex items-center justify-between px-6 py-4"
                style={{
                    background: "linear-gradient(135deg, #9333ea 0%, #2563eb 100%)",
                }}
            >
                <h2 className="text-lg font-semibold text-white">{title}</h2>
                <button
                    onClick={onClose}
                    className="text-white/70 hover:text-white transition-colors rounded-full p-1"
                >
                    <IconX size={20} />
                </button>
            </div>
            <div className="px-6 py-5">{children}</div>
        </div>
    </div>
);

// ─── Unit Form (shared by Add & Edit) ─────────────────────────────────────────
const Field = ({ label, name, value, onChange, placeholder, icon: Icon, required }) => (
    <div className="space-y-1.5">
        <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
            {Icon && <Icon size={14} className="text-purple-500" />}
            {label}
            {required && <span className="text-red-500">*</span>}
        </label>
        <input
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className="w-full px-3 py-2.5 rounded-xl text-sm border border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
        />
    </div>
);

const UnitForm = ({ initial = {}, onSubmit, isLoading, submitLabel }) => {
    const [form, setForm] = useState({
        title: initial.title || "",
        location: initial.location || "",
        headName: initial.headName || "",
        headContactDetail: initial.headContactDetail || "",
    });

    const handle = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

    const submit = (e) => {
        e.preventDefault();
        if (!form.title.trim()) {
            toast.error("Unit title is required");
            return;
        }
        onSubmit(form);
    };

    return (
        <form onSubmit={submit} className="space-y-4">
            <Field label="Unit Title" name="title" value={form.title} onChange={handle} placeholder="e.g. UNIT_6 or Production Unit" icon={IconBuilding} required />
            <Field label="Location" name="location" value={form.location} onChange={handle} placeholder="e.g. Building A, Floor 2" icon={IconMapPin} />
            <Field label="Head Name" name="headName" value={form.headName} onChange={handle} placeholder="e.g. John Smith" icon={IconUser} />
            <Field label="Head Contact Detail" name="headContactDetail" value={form.headContactDetail} onChange={handle} placeholder="e.g. +91 98765 43210" icon={IconPhone} />

            <div className="flex gap-3 pt-2">
                <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60"
                    style={{ background: "linear-gradient(135deg, #9333ea, #2563eb)" }}
                >
                    {isLoading && <IconLoader size={16} className="animate-spin" />}
                    {submitLabel}
                </button>
            </div>
        </form>
    );
};

// ─── Delete Confirm Modal ──────────────────────────────────────────────────────
const DeleteModal = ({ unit, onConfirm, onClose, isLoading }) => (
    <Modal title="Delete Unit" onClose={onClose}>
        <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-100">
                <IconAlertTriangle size={20} className="text-red-500 mt-0.5 shrink-0" />
                <div>
                    <p className="text-sm font-medium text-red-700">This action cannot be undone</p>
                    <p className="text-sm text-red-600 mt-1">
                        Are you sure you want to delete <strong>{unit.title}</strong>? Units with assigned users cannot be deleted.
                    </p>
                </div>
            </div>
            <div className="flex gap-3">
                <button
                    onClick={onClose}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={onConfirm}
                    disabled={isLoading}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-60"
                >
                    {isLoading && <IconLoader size={16} className="animate-spin" />}
                    Delete
                </button>
            </div>
        </div>
    </Modal>
);

// ─── Main Page ─────────────────────────────────────────────────────────────────
const UnitManagement = () => {
    const { data: response, isLoading, isError } = useGetAllUnitsQuery(undefined, { refetchOnMountOrArgChange: true });
    const [createUnit, { isLoading: creating }] = useCreateUnitMutation();
    const [updateUnit, { isLoading: updating }] = useUpdateUnitMutation();
    const [deleteUnit, { isLoading: deleting }] = useDeleteUnitMutation();

    const units = response?.data || [];

    const [search, setSearch] = useState("");
    const [addOpen, setAddOpen] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return units;
        return units.filter(
            (u) =>
                u.title?.toLowerCase().includes(q) ||
                u.location?.toLowerCase().includes(q) ||
                u.headName?.toLowerCase().includes(q) ||
                u.adminName?.toLowerCase().includes(q) ||
                u.adminUserName?.toLowerCase().includes(q) ||
                u.adminEmail?.toLowerCase().includes(q)
        );
    }, [units, search]);

    const handleCreate = async (form) => {
        try {
            await createUnit(form).unwrap();
            toast.success("Unit created successfully");
            setAddOpen(false);
        } catch (err) {
            toast.error(err?.data?.message || "Failed to create unit");
        }
    };

    const handleUpdate = async (form) => {
        try {
            await updateUnit({ id: editTarget.id, ...form }).unwrap();
            toast.success("Unit updated successfully");
            setEditTarget(null);
        } catch (err) {
            toast.error(err?.data?.message || "Failed to update unit");
        }
    };

    const handleDelete = async () => {
        try {
            await deleteUnit(deleteTarget.id).unwrap();
            toast.success("Unit deleted successfully");
            setDeleteTarget(null);
        } catch (err) {
            toast.error(err?.data?.message || "Failed to delete unit");
        }
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div
                        className="p-3 rounded-2xl"
                        style={{ background: "linear-gradient(135deg, #9333ea, #2563eb)" }}
                    >
                        <IconBuilding size={22} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Unit Management</h1>
                        <p className="text-sm text-gray-500">
                            {units.length} unit{units.length !== 1 ? "s" : ""} configured
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => setAddOpen(true)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-lg shadow-purple-200 hover:shadow-purple-300 transition-all hover:scale-[1.02]"
                    style={{ background: "linear-gradient(135deg, #9333ea, #2563eb)" }}
                >
                    <IconPlus size={16} />
                    Add Unit
                </button>
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
                <IconSearch
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by title, location, or head…"
                    className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                />
                {search && (
                    <button
                        onClick={() => setSearch("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                        <IconX size={14} />
                    </button>
                )}
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <IconLoader size={32} className="animate-spin text-purple-500" />
                </div>
            ) : isError ? (
                <div className="text-center py-20 text-red-500 text-sm">
                    Failed to load units. Please refresh the page.
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-20 text-gray-400 text-sm">
                    {search ? "No units match your search." : "No units found. Click \"Add Unit\" to create one."}
                </div>
            ) : (
                <>
                    {/* Desktop table */}
                    <div className="hidden md:block rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                        <table className="w-full text-sm">
                            <thead>
                                <tr style={{ background: "linear-gradient(135deg, #f5f3ff, #eff6ff)" }}>
                                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Title</th>
                                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Location</th>
                                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Head</th>
                                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-5 py-3.5" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtered.map((unit) => (
                                    <tr key={unit.id} className="hover:bg-purple-50/30 transition-colors">
                                        <td className="px-5 py-4 font-semibold text-gray-800">{unit.title}</td>
                                        <td className="px-5 py-4 text-gray-500">{unit.location || "—"}</td>
                                        <td className="px-5 py-4 text-gray-700">
                                            {unit.adminName ? (
                                                <span>
                                                    {unit.adminName}
                                                    <span className="ml-1 text-xs text-gray-400">(@{unit.adminUserName})</span>
                                                </span>
                                            ) : (
                                                <span className="text-gray-500">{unit.headName || "—"}</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-4 text-gray-500">
                                            {unit.adminName ? (
                                                <span>
                                                    {unit.adminContact || unit.adminEmail || "—"}
                                                </span>
                                            ) : (
                                                unit.headContactDetail || "—"
                                            )}
                                        </td>
                                        <td className="px-5 py-4">
                                            <span
                                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                    unit.isActive
                                                        ? "bg-green-100 text-green-700"
                                                        : "bg-gray-100 text-gray-500"
                                                }`}
                                            >
                                                {unit.isActive ? "Active" : "Inactive"}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-2 justify-end">
                                                <button
                                                    onClick={() => setEditTarget(unit)}
                                                    className="p-2 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                                                    title="Edit"
                                                >
                                                    <IconEdit size={16} />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteTarget(unit)}
                                                    className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                                    title="Delete"
                                                >
                                                    <IconTrash size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile cards */}
                    <div className="md:hidden space-y-3">
                        {filtered.map((unit) => (
                            <div
                                key={unit.id}
                                className="rounded-2xl p-4 border border-gray-100 shadow-sm bg-white space-y-3"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <p className="font-semibold text-gray-800">{unit.title}</p>
                                        {unit.location && (
                                            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                                                <IconMapPin size={12} /> {unit.location}
                                            </p>
                                        )}
                                    </div>
                                    <span
                                        className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                            unit.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                                        }`}
                                    >
                                        {unit.isActive ? "Active" : "Inactive"}
                                    </span>
                                </div>
                                {(unit.adminName || unit.headName || unit.headContactDetail) && (
                                    <div className="text-xs text-gray-500 space-y-1">
                                        {unit.adminName ? (
                                            <>
                                                <p className="flex items-center gap-1.5">
                                                    <IconUser size={12} className="text-purple-400" />
                                                    <span className="text-gray-700">{unit.adminName}</span>
                                                    <span className="text-gray-400">(@{unit.adminUserName})</span>
                                                </p>
                                                {(unit.adminContact || unit.adminEmail) && (
                                                    <p className="flex items-center gap-1.5">
                                                        <IconPhone size={12} className="text-purple-400" />
                                                        {unit.adminContact || unit.adminEmail}
                                                    </p>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                {unit.headName && (
                                                    <p className="flex items-center gap-1.5">
                                                        <IconUser size={12} className="text-purple-400" /> {unit.headName}
                                                    </p>
                                                )}
                                                {unit.headContactDetail && (
                                                    <p className="flex items-center gap-1.5">
                                                        <IconPhone size={12} className="text-purple-400" /> {unit.headContactDetail}
                                                    </p>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}
                                <div className="flex gap-2 pt-1">
                                    <button
                                        onClick={() => setEditTarget(unit)}
                                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium border border-purple-200 text-purple-600 hover:bg-purple-50 transition-colors"
                                    >
                                        <IconEdit size={14} /> Edit
                                    </button>
                                    <button
                                        onClick={() => setDeleteTarget(unit)}
                                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                                    >
                                        <IconTrash size={14} /> Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Add Modal */}
            {addOpen && (
                <Modal title="Add New Unit" onClose={() => setAddOpen(false)}>
                    <UnitForm onSubmit={handleCreate} isLoading={creating} submitLabel="Create Unit" />
                </Modal>
            )}

            {/* Edit Modal */}
            {editTarget && (
                <Modal title={`Edit — ${editTarget.title}`} onClose={() => setEditTarget(null)}>
                    <UnitForm
                        initial={editTarget}
                        onSubmit={handleUpdate}
                        isLoading={updating}
                        submitLabel="Save Changes"
                    />
                </Modal>
            )}

            {/* Delete Modal */}
            {deleteTarget && (
                <DeleteModal
                    unit={deleteTarget}
                    onConfirm={handleDelete}
                    onClose={() => setDeleteTarget(null)}
                    isLoading={deleting}
                />
            )}
        </div>
    );
};

export default UnitManagement;
