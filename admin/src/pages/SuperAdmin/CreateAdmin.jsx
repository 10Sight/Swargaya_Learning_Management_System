import React, { useState } from "react";
import { toast } from "sonner";
import {
    IconPlus,
    IconSearch,
    IconEdit,
    IconTrash,
    IconRefresh,
    IconLoader,
    IconUserShield,
    IconEye,
    IconEyeOff,
    IconChevronLeft,
    IconChevronRight,
} from "@tabler/icons-react";
import {
    useGetAllUsersQuery,
    useCreateUserMutation,
    useUpdateUserMutation,
    useDeleteUserMutation,
} from "@/Redux/AllApi/UserApi";
import { useGetAllUnitsQuery } from "@/Redux/AllApi/UnitApi";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const EMPTY_CREATE_FORM = {
    fullName: "",
    userName: "",
    email: "",
    phoneNumber: "",
    password: "",
    unit: "",
    role: "ADMIN",
    doj: "",
    dob: "",
};

const formatDateForInput = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toISOString().split("T")[0];
};

const getInitials = (name = "") =>
    name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

const CreateAdmin = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [createFormData, setCreateFormData] = useState(EMPTY_CREATE_FORM);
    const [editFormData, setEditFormData] = useState({});
    const [showCreatePassword, setShowCreatePassword] = useState(false);

    const { data: usersResponse, isLoading, isFetching, refetch } = useGetAllUsersQuery({
        role: "ADMIN",
        page: currentPage,
        limit: 10,
        search: searchTerm,
    });

    const { data: unitsResponse } = useGetAllUnitsQuery();
    const unitOptions = unitsResponse?.data || [];

    const [createUser, { isLoading: isCreating }] = useCreateUserMutation();
    const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();
    const [deleteUser, { isLoading: isDeleting }] = useDeleteUserMutation();

    const users = usersResponse?.data?.users || [];
    const totalPages = usersResponse?.data?.totalPages || 1;
    const totalUsers = usersResponse?.data?.totalUsers;

    // ── Create ──────────────────────────────────────────────────────────────
    const handleCreateChange = (e) => {
        const { name, value } = e.target;
        setCreateFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleCreateSelect = (name, value) => {
        setCreateFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        const { fullName, userName, email, password, unit } = createFormData;
        if (!fullName || !userName || !email || !password || !unit) {
            toast.error("Please fill in all required fields");
            return;
        }
        try {
            await createUser(createFormData).unwrap();
            toast.success("Admin user created successfully");
            setCreateFormData(EMPTY_CREATE_FORM);
            setShowCreateModal(false);
        } catch (error) {
            toast.error(error?.data?.message || "Failed to create admin user");
        }
    };

    // ── Edit ────────────────────────────────────────────────────────────────
    const openEditModal = (user) => {
        setSelectedUser(user);
        setEditFormData({
            fullName: user.fullName || "",
            userName: user.userName || "",
            email: user.email || "",
            phoneNumber: user.phoneNumber || "",
            unit: user.unit || "",
            doj: formatDateForInput(user.doj),
            dob: formatDateForInput(user.dob),
        });
        setShowEditModal(true);
    };

    const handleEditChange = (e) => {
        const { name, value } = e.target;
        setEditFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleEditSelect = (name, value) => {
        setEditFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        try {
            await updateUser({ id: selectedUser._id || selectedUser.id, ...editFormData }).unwrap();
            toast.success("Admin updated successfully");
            setShowEditModal(false);
            setSelectedUser(null);
        } catch (error) {
            toast.error(error?.data?.message || "Failed to update admin user");
        }
    };

    // ── Delete ───────────────────────────────────────────────────────────────
    const openDeleteDialog = (user) => {
        setSelectedUser(user);
        setShowDeleteDialog(true);
    };

    const handleDelete = async () => {
        try {
            await deleteUser(selectedUser._id || selectedUser.id).unwrap();
            toast.success("Admin user removed successfully");
            setShowDeleteDialog(false);
            setSelectedUser(null);
        } catch (error) {
            toast.error(error?.data?.message || "Failed to delete admin user");
        }
    };

    // ── Search / Pagination ──────────────────────────────────────────────────
    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[#111827]">Admin User Management</h1>
                    <p className="text-[#6b7280] text-sm mt-1">
                        Manage all administrator accounts in the system
                    </p>
                </div>
                <Button
                    className="bg-[#9333ea] hover:bg-[#7e22ce] text-white gap-2"
                    onClick={() => setShowCreateModal(true)}
                >
                    <IconPlus className="w-4 h-4" />
                    Create Admin
                </Button>
            </div>

            {/* Controls */}
            <Card>
                <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="relative flex-1 max-w-sm">
                            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]" />
                            <Input
                                placeholder="Search admins..."
                                value={searchTerm}
                                onChange={handleSearch}
                                className="pl-9"
                            />
                        </div>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => refetch()}
                            disabled={isFetching}
                            title="Refresh"
                        >
                            <IconRefresh className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <IconUserShield className="w-4 h-4 text-[#9333ea]" />
                        Administrators
                        {totalUsers !== undefined && (
                            <span className="text-[#6b7280] font-normal text-sm">
                                ({totalUsers} total)
                            </span>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-[#f9fafb]">
                                    <TableHead className="pl-6">User</TableHead>
                                    <TableHead>Contact</TableHead>
                                    <TableHead>Unit</TableHead>
                                    <TableHead>Date of Joining</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right pr-6">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-12 text-[#6b7280]">
                                            <IconLoader className="w-5 h-5 animate-spin mx-auto mb-2" />
                                            Loading admins...
                                        </TableCell>
                                    </TableRow>
                                ) : users.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-12 text-[#6b7280]">
                                            No admin users found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    users.map((user) => (
                                        <TableRow key={user._id || user.id} className="hover:bg-[#f9fafb]">
                                            <TableCell className="pl-6">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-9 w-9">
                                                        <AvatarImage src={user.avatar} />
                                                        <AvatarFallback className="bg-[#ede9fe] text-[#7c3aed] text-xs font-semibold">
                                                            {getInitials(user.fullName)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="font-medium text-[#111827] text-sm leading-tight">
                                                            {user.fullName}
                                                        </p>
                                                        <p className="text-[#9ca3af] text-xs">@{user.userName}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <p className="text-sm text-[#374151]">{user.email}</p>
                                                {user.phoneNumber && (
                                                    <p className="text-xs text-[#9ca3af]">{user.phoneNumber}</p>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-sm text-[#374151]">{user.unit || "—"}</span>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-sm text-[#374151]">
                                                    {user.doj
                                                        ? new Date(user.doj).toLocaleDateString("en-IN", {
                                                              day: "2-digit",
                                                              month: "short",
                                                              year: "numeric",
                                                          })
                                                        : "—"}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    className={
                                                        user.status === "ACTIVE"
                                                            ? "border-green-200 bg-green-50 text-green-700"
                                                            : "border-red-200 bg-red-50 text-red-700"
                                                    }
                                                >
                                                    {user.status || "ACTIVE"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right pr-6">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-[#6b7280] hover:text-[#9333ea] hover:bg-[#f5f3ff]"
                                                        onClick={() => openEditModal(user)}
                                                    >
                                                        <IconEdit className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-[#6b7280] hover:text-red-600 hover:bg-red-50"
                                                        onClick={() => openDeleteDialog(user)}
                                                    >
                                                        <IconTrash className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-6 py-4 border-t">
                            <p className="text-sm text-[#6b7280]">
                                Page {currentPage} of {totalPages}
                            </p>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                >
                                    <IconChevronLeft className="w-4 h-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                >
                                    <IconChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ── Create Modal ────────────────────────────────────────────── */}
            <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <IconUserShield className="w-5 h-5 text-[#9333ea]" />
                            Create Admin Account
                        </DialogTitle>
                        <DialogDescription>
                            The new account will be assigned the Admin role automatically.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreateSubmit} className="space-y-5 mt-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="c-fullName">Full Name *</Label>
                                <Input
                                    id="c-fullName"
                                    name="fullName"
                                    value={createFormData.fullName}
                                    onChange={handleCreateChange}
                                    placeholder="e.g. John Doe"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="c-userName">Username *</Label>
                                <Input
                                    id="c-userName"
                                    name="userName"
                                    value={createFormData.userName}
                                    onChange={handleCreateChange}
                                    placeholder="e.g. johndoe"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="c-email">Email Address *</Label>
                                <Input
                                    id="c-email"
                                    name="email"
                                    type="email"
                                    value={createFormData.email}
                                    onChange={handleCreateChange}
                                    placeholder="e.g. john@example.com"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="c-phoneNumber">Phone Number</Label>
                                <Input
                                    id="c-phoneNumber"
                                    name="phoneNumber"
                                    value={createFormData.phoneNumber}
                                    onChange={handleCreateChange}
                                    placeholder="e.g. +1234567890"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="c-password">Password *</Label>
                                <div className="relative">
                                    <Input
                                        id="c-password"
                                        name="password"
                                        type={showCreatePassword ? "text" : "password"}
                                        value={createFormData.password}
                                        onChange={handleCreateChange}
                                        placeholder="••••••••"
                                        className="pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowCreatePassword((p) => !p)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b7280] hover:text-[#111827]"
                                        tabIndex={-1}
                                    >
                                        {showCreatePassword ? (
                                            <IconEyeOff className="w-4 h-4" />
                                        ) : (
                                            <IconEye className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Unit *</Label>
                                <Select
                                    value={createFormData.unit}
                                    onValueChange={(val) => handleCreateSelect("unit", val)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Unit" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {unitOptions.map((u) => (
                                            <SelectItem key={u.id} value={u.title}>
                                                {u.title}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="c-doj">Date of Joining</Label>
                                <Input
                                    id="c-doj"
                                    name="doj"
                                    type="date"
                                    value={createFormData.doj}
                                    onChange={handleCreateChange}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="c-dob">Date of Birth</Label>
                                <Input
                                    id="c-dob"
                                    name="dob"
                                    type="date"
                                    value={createFormData.dob}
                                    onChange={handleCreateChange}
                                />
                            </div>
                        </div>

                        <div className="bg-[#fefce8] border border-[#fef08a] rounded-md p-3 text-sm text-[#854d0e] flex gap-2 items-start">
                            <IconUserShield className="w-4 h-4 shrink-0 mt-0.5" />
                            <p>
                                This user will be granted <strong>Admin</strong> access — they can manage
                                courses, instructors, and students within their assigned unit.
                            </p>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowCreateModal(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="bg-[#9333ea] hover:bg-[#7e22ce] text-white"
                                disabled={isCreating}
                            >
                                {isCreating && <IconLoader className="w-4 h-4 mr-2 animate-spin" />}
                                Create Admin
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ── Edit Modal ──────────────────────────────────────────────── */}
            <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <IconEdit className="w-5 h-5 text-[#9333ea]" />
                            Edit Admin
                        </DialogTitle>
                        <DialogDescription>
                            Update details for {selectedUser?.fullName}. Password cannot be changed here.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleEditSubmit} className="space-y-5 mt-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="e-fullName">Full Name</Label>
                                <Input
                                    id="e-fullName"
                                    name="fullName"
                                    value={editFormData.fullName || ""}
                                    onChange={handleEditChange}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="e-userName">Username</Label>
                                <Input
                                    id="e-userName"
                                    name="userName"
                                    value={editFormData.userName || ""}
                                    onChange={handleEditChange}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="e-email">Email Address</Label>
                                <Input
                                    id="e-email"
                                    name="email"
                                    type="email"
                                    value={editFormData.email || ""}
                                    onChange={handleEditChange}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="e-phoneNumber">Phone Number</Label>
                                <Input
                                    id="e-phoneNumber"
                                    name="phoneNumber"
                                    value={editFormData.phoneNumber || ""}
                                    onChange={handleEditChange}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Unit</Label>
                                <Select
                                    value={editFormData.unit || ""}
                                    onValueChange={(val) => handleEditSelect("unit", val)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Unit" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {unitOptions.map((u) => (
                                            <SelectItem key={u.id} value={u.title}>
                                                {u.title}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="e-doj">Date of Joining</Label>
                                <Input
                                    id="e-doj"
                                    name="doj"
                                    type="date"
                                    value={editFormData.doj || ""}
                                    onChange={handleEditChange}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="e-dob">Date of Birth</Label>
                                <Input
                                    id="e-dob"
                                    name="dob"
                                    type="date"
                                    value={editFormData.dob || ""}
                                    onChange={handleEditChange}
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowEditModal(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="bg-[#9333ea] hover:bg-[#7e22ce] text-white"
                                disabled={isUpdating}
                            >
                                {isUpdating && <IconLoader className="w-4 h-4 mr-2 animate-spin" />}
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ── Delete Confirmation ─────────────────────────────────────── */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove Admin User</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to remove{" "}
                            <strong>{selectedUser?.fullName}</strong> from the system? This action
                            will deactivate their account.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700 text-white"
                            onClick={handleDelete}
                            disabled={isDeleting}
                        >
                            {isDeleting && <IconLoader className="w-4 h-4 mr-2 animate-spin" />}
                            Remove
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default CreateAdmin;
