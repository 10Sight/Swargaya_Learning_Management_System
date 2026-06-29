import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { logout } from "@/Redux/Slice/AuthSlice";
import {
  IconLayoutDashboardFilled,
  IconLayoutSidebarRightCollapse,
  IconLogout,
  IconMail,
  IconArticle,
  IconClipboardList,
  IconShoppingCart,
  IconTarget,
  IconCertificate,
  IconFolder,
  IconUsers,
  IconChartPie,
  IconUser,
  IconSettings,
  IconDatabase,
  IconShield,
  IconReport,
  IconTrash,
  IconFileAnalytics,
  IconServerBolt,
  IconBulb,
  IconDownload,
  IconClock,
  IconLayersIntersect,
  IconUserPlus,
  IconBuilding,
} from "@tabler/icons-react";
import { HomeIcon } from "lucide-react";
import useTranslate from "@/hooks/useTranslate";
import LanguageSelector from "../components/common/LanguageSelector";

const tabs = [
  {
    category: "Overview",
    items: [
      { link: "/superadmin", labelKey: "nav.dashboard", icon: IconLayoutDashboardFilled },
    ]
  },
  {
    category: "User Management",
    items: [
      { link: "/superadmin/all-users", labelKey: "nav.allUsers", icon: IconUsers },
      { link: "/superadmin/add-admin", label: "Create Admin", icon: IconUserPlus },
      { link: "/superadmin/trainers", labelKey: "nav.instructors", icon: IconUser },
      { link: "/superadmin/employees", labelKey: "nav.students", icon: IconUsers },
      { link: "/superadmin/soft-deleted-users", labelKey: "nav.deletedUsers", icon: IconTrash },
      { link: "/superadmin/roles-permissions", labelKey: "nav.rolesPermissions", icon: IconShield },
    ]
  },
  {
    category: "Content Management",
    items: [
      { link: "/superadmin/courses", labelKey: "nav.courses", icon: IconCertificate },
      { link: "/superadmin/departments", labelKey: "nav.departments", icon: IconFolder },
      { link: "/superadmin/module-timelines", labelKey: "nav.moduleTimelines", icon: IconClock },
      { link: "/superadmin/course-level-settings", labelKey: "nav.courseLevelSettings", icon: IconLayersIntersect },
      { link: "/superadmin/student-levels", labelKey: "nav.studentLevels", icon: IconSettings },
      { link: "/superadmin/certificates", labelKey: "nav.certificates", icon: IconCertificate },
    ]
  },
  {
    category: "System Management",
    items: [
      { link: "/superadmin/units", label: "Manage Units", icon: IconBuilding },
      { link: "/superadmin/audit-logs", labelKey: "nav.auditLogs", icon: IconFileAnalytics },
      { link: "/superadmin/system-settings", labelKey: "nav.systemSettings", icon: IconSettings },
      { link: "/superadmin/analytics-reports", labelKey: "nav.analyticsReports", icon: IconReport },
      { link: "/superadmin/system-monitoring", labelKey: "nav.systemHealth", icon: IconServerBolt },
    ]
  },
  {
    category: "Advanced Operations",
    items: [
      { link: "/superadmin/data-management", labelKey: "nav.dataManagement", icon: IconDatabase },
      { link: "/superadmin/bulk-operations", labelKey: "nav.bulkOperations", icon: IconBulb },
    ]
  },
];

export function SuperAdminLayout() {
  const [collapsed, setCollapsed] = useState(
    window.innerWidth >= 820 ? false : true
  );
  const [pageName, setPageName] = useState("Dashboard");

  const { t, language } = useTranslate();

  const translatedTabs = tabs.map((category) => ({
    ...category,
    items: category.items.map((item) => ({
      ...item,
      label: item.labelKey ? t(item.labelKey) : item.label,
    })),
  }));

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, isLoading } = useSelector((state) => state.auth);

  // Update page name based on current route
  useEffect(() => {
    let foundTab = null;

    // Search through all categories and items
    for (const category of translatedTabs) {
      foundTab = category.items.find(tab =>
        pathname === tab.link ||
        (tab.link !== "/superadmin" && pathname.startsWith(tab.link))
      );
      if (foundTab) break;
    }

    if (foundTab) {
      setPageName(foundTab.label);
    } else if (pathname === "/superadmin") {
      setPageName(t("nav.dashboard"));
    } else {
      // For nested routes, extract from pathname
      const routeName = pathname.split("/").pop();
      setPageName(routeName.charAt(0).toUpperCase() + routeName.slice(1).replace("-", " "));
    }
  }, [pathname, language, translatedTabs, t]);

  const toggleSidebar = () => {
    setCollapsed((prev) => !prev);
  };

  const handleLogout = async () => {
    try {
      await dispatch(logout()).unwrap();
      navigate("/login", { replace: true });
    } catch (error) {
      // Even if logout fails, redirect to login (toast handled by Redux)
      navigate("/login", { replace: true });
    }
  };


  const ToggleButton = ({ opened, onClick, ariaLabel }) => {
    return (
      <IconLayoutSidebarRightCollapse
        className={`${opened ? "rotate-180" : "mx-auto"
          } min-w-5 min-h-5 duration-500 transition-all cursor-pointer text-[#4b5563] hover:text-[#1f2937]`}
        onClick={onClick}
        aria-label={ariaLabel}
      />
    );
  };

  return (
    <div className="flex min-h-screen" style={{ background: 'linear-gradient(to bottom right, #f8fafc, rgba(250, 245, 255, 0.3), rgba(238, 242, 255, 0.2))' }}>
      {/* Sidebar */}
      <nav
        className={`fixed top-0 left-0 h-screen backdrop-blur-xl transition-all duration-300 z-20 shadow-2xl ${collapsed ? "w-16" : "w-64"} `}
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderRight: '1px solid rgba(229, 231, 235, 0.5)',
          color: '#000000'
        }}
      >
        <div
          className={`relative h-16 items-center flex transition-all p-4 duration-300 z-50 backdrop-blur-sm`}
          style={{
            borderBottom: '1px solid rgba(229, 231, 235, 0.8)',
            backgroundColor: 'rgba(255, 255, 255, 0.5)'
          }}
        >
          <ToggleButton
            opened={!collapsed}
            onClick={toggleSidebar}
            ariaLabel="Toggle sidebar"
          />
          {!collapsed && (
            <span className="ml-4 py-1 text-sm font-bold uppercase tracking-wider bg-gradient-to-r from-[#9333ea] to-[#2563eb] bg-clip-text text-transparent">
              {t("header.superAdmin")}
            </span>
          )}
        </div>

        {/* Sidebar Tabs */}
        <div className="px-2 flex flex-col w-full py-4 space-y-1 overflow-y-auto max-h-[calc(100vh-8rem)]">
          {translatedTabs.map((category) => (
            <div key={category.category} className="mb-4">
              {!collapsed && (
                <div className="px-2 mb-2">
                  <h3 className="text-xs font-semibold text-[#9ca3af] uppercase tracking-wider">
                    {category.category}
                  </h3>
                </div>
              )}
              <div className="space-y-1">
                {category.items.map((item) => {
                  const isActive =
                    pathname === item.link ||
                    (item.link === "/superadmin" && pathname === "/superadmin") ||
                    (item.link !== "/superadmin" && pathname.startsWith(item.link));

                  return (
                    <div
                      className={`group relative flex items-center cursor-pointer w-full overflow-hidden h-10 rounded-xl transition-all duration-300 hover:scale-[1.02]
                      ${collapsed ? "justify-center mx-1" : "items-center px-3"}`}
                      key={item.label}
                      onClick={() => navigate(item.link)}
                      title={collapsed ? item.label : ''}
                      style={{
                        background: isActive ? 'linear-gradient(to right, #9333ea, #2563eb)' : 'transparent',
                        color: isActive ? '#ffffff' : '#4b5563',
                        boxShadow: isActive ? '0 10px 15px -3px rgba(233, 213, 255, 1)' : 'none'
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'linear-gradient(to right, #faf5ff, #eff6ff)';
                          e.currentTarget.style.color = '#7e22ce';
                          e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = '#4b5563';
                          e.currentTarget.style.boxShadow = 'none';
                        }
                      }}
                    >
                      {isActive && !collapsed && (
                        <div className="absolute left-0 top-0 h-full w-1 rounded-r-full" style={{ backgroundColor: '#ffffff' }} />
                      )}
                      <item.icon
                        className={`${collapsed ? "w-5 h-5" : "min-w-4 min-h-4"
                          } transition-transform group-hover:scale-110`}
                        strokeWidth={isActive ? 2.5 : 1.5}
                      />
                      {!collapsed && (
                        <span className="ml-3 text-sm font-medium transition-all group-hover:translate-x-0.5">{item.label}</span>
                      )}
                      {!collapsed && (
                        <div className={`ml-auto opacity-0 group-hover:opacity-100 transition-opacity ${isActive ? 'text-[#e9d5ff]' : 'text-[#9ca3af]'
                          }`}>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Logout */}
        <div className="absolute bottom-4 w-full px-2">
          <div
            className={`p-2 flex items-center rounded-lg w-full transition-all duration-200 ${isLoading
              ? "opacity-50 cursor-not-allowed bg-[#f3f4f6]"
              : "hover:bg-[#fef2f2] hover:text-[#dc2626] cursor-pointer"
              } ${collapsed ? "justify-center" : "px-3"
              }`}
            onClick={isLoading ? undefined : handleLogout}
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#dc2626]"></div>
            ) : (
              <IconLogout className="min-w-5 min-h-5" stroke={1.5} />
            )}
            {!collapsed && (
              <span className="ml-3 text-sm font-medium">
                {isLoading ? t("auth.loggingOut") : t("auth.logout")}
              </span>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <div
        className={`flex-1 transition-all duration-300 ${collapsed ? "ml-16" : "ml-64"
          }`}
      >
        {/* Header */}
        <header
          className={`px-4 sm:px-6 backdrop-blur-lg shadow-sm flex h-16 items-center justify-between gap-2 sm:gap-4 fixed right-0 top-0 z-30 transition-all duration-300 ${collapsed ? "w-[calc(100%-4rem)]" : "w-[calc(100%-16rem)]"
            }`}
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderBottom: '1px solid rgba(229, 231, 235, 0.8)'
          }}
        >
          {/* Left side (Breadcrumb) */}
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <Link
                  to="/superadmin"
                  className="flex items-center text-[#9333ea] hover:text-[#6b21a8] transition-colors"
                >
                  <HomeIcon size={18} aria-hidden="true" />
                  <span className="sr-only">Home</span>
                </Link>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="text-[#1f2937] font-medium">
                  {pageName}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {/* Right side (Avatar) */}
          <div className="relative flex items-center gap-3">
            <LanguageSelector />
            <div className="mr-2 text-right hidden lg:block">
              <p className="text-sm font-medium text-[#1f2937] truncate max-w-32">
                {user?.fullName || user?.userName || 'Admin User'}
              </p>
              <p className="text-xs text-[#6b7280] capitalize">
                {user?.role?.toLowerCase().replace('_', ' ') || 'Super Admin'}
              </p>
            </div>

            {/* Avatar */}
            <div className="relative">
              <input id="superadmin-avatar-input" type="file" accept="image/*" className="hidden" onChange={async (e) => {
                const file = e.target.files?.[0]; if (!file) return; if (!file.type.startsWith('image/')) { alert('Please select an image'); e.target.value = ''; return; }
                const form = new FormData(); form.append('avatar', file);
                try {
                  const { useUpdateAvatarMutation } = await import('@/Redux/AllApi/UserApi'); const { profile: fetchProfile } = await import('@/Redux/Slice/AuthSlice');
                  const update = useUpdateAvatarMutation; /* placeholder to satisfy bundler */
                } catch (_) { }
              }} />
              <div className="relative size-9 sm:size-10 group">
                <img
                  src={user?.avatar?.url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.fullName || user?.userName || 'Admin User')}&background=7c3aed&color=fff`}
                  className="rounded-full size-full border-2 border-white shadow-md object-cover transition-transform group-hover:scale-105 ring-2 ring-[#f3e8ff] cursor-pointer"
                  alt="User avatar"
                  onClick={() => document.getElementById('superadmin-avatar-input').click()}
                  title="Change profile picture"
                />
                <div className="absolute bg-[#22c55e] rounded-full bottom-0 right-0 size-2.5 sm:size-3 border-2 border-white"></div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="pt-20 pb-6 px-4 sm:px-6 min-h-screen">
          <div className="backdrop-blur-sm rounded-xl shadow-sm p-4 sm:p-6 transition-all duration-300 hover:shadow-md"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              border: '1px solid rgba(229, 231, 235, 0.5)'
            }}
          >
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}