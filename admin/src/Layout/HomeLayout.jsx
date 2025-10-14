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
  IconTemplate,
  IconClock,
  IconFileAnalytics,
} from "@tabler/icons-react";
import { HomeIcon } from "lucide-react";
import NotificationCenter from "../components/common/NotificationCenter";

const tabs = [
  { link: "/admin", label: "Dashboard", icon: IconLayoutDashboardFilled },
  { link: "/admin/instructor", label: "Instructors", icon: IconUser },
  { link: "/admin/courses", label: "Courses", icon: IconCertificate },
  { link: "/admin/batches", label: "Batches", icon: IconFolder },
  { link: "/admin/students", label: "Students", icon: IconUsers },
  { link: "/admin/module-timelines", label: "Module Timelines", icon: IconClock },
  { link: "/admin/student-levels", label: "Student Levels", icon: IconSettings },
  { link: "/admin/certificate-templates", label: "Certificate Templates", icon: IconTemplate },
  { link: "/admin/analytics", label: "Analytics", icon: IconChartPie },
];

export function HomeLayout() {
  const [collapsed, setCollapsed] = useState(
    window.innerWidth >= 820 ? false : true
  );
  const [pageName, setPageName] = useState("Dashboard");

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, isLoading } = useSelector((state) => state.auth);

  // Update page name based on current route
  useEffect(() => {
    const currentTab = tabs.find(tab => 
      pathname === tab.link || 
      (tab.link !== "/admin" && pathname.startsWith(tab.link))
    );
    
    if (currentTab) {
      setPageName(currentTab.label);
    } else if (pathname === "/admin") {
      setPageName("Dashboard");
    } else {
      // For nested routes, you might want to extract from pathname
      const routeName = pathname.split("/").pop();
      setPageName(routeName.charAt(0).toUpperCase() + routeName.slice(1));
    }
  }, [pathname]);

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
        className={`${
          opened ? "rotate-180" : "mx-auto"
        } min-w-5 min-h-5 duration-500 transition-all cursor-pointer text-gray-600 hover:text-gray-800`}
        onClick={onClick}
        aria-label={ariaLabel}
      />
    );
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <nav
        className={`fixed top-0 left-0 h-screen bg-white text-black shadow-lg transition-all duration-300 z-20
                ${collapsed ? "w-16" : "w-64"} `}
      >
        <div
          className={`relative h-16 items-center flex transition-all p-4 duration-300 z-50 border-b border-gray-200`}
        >
          <ToggleButton
            opened={!collapsed}
            onClick={toggleSidebar}
            ariaLabel="Toggle sidebar"
          />
          {!collapsed && (
            <span className="ml-4 py-1 text-sm font-semibold uppercase tracking-wide text-blue-700">
              SARVAGAYA INSTITUTE
            </span>
          )}
        </div>

        {/* Sidebar Tabs */}
        <div className="px-2 flex flex-col w-full py-4 space-y-2">
          {tabs.map((item) => {
            const isActive =
              pathname === item.link ||
              (item.link === "/admin" && pathname === "/admin") ||
              (item.link !== "/admin" && pathname.startsWith(item.link));

            return (
              <div
                className={`flex items-center cursor-pointer w-full overflow-hidden h-11 rounded-lg transition-all duration-300
                ${
                  isActive
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-600 hover:bg-blue-50 hover:text-blue-600"
                }
                ${collapsed ? "justify-center " : " items-center px-3"}`}
                key={item.label}
                onClick={() => navigate(item.link)}
              >
                <item.icon
                  className={`${
                    collapsed ? "w-5 h-5" : "min-w-5 min-h-5"
                  } my-auto`}
                  strokeWidth={isActive ? 2 : 1.5}
                />
                {!collapsed && (
                  <span className="ml-3 text-sm font-medium">{item.label}</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Logout */}
        <div className="absolute bottom-4 w-full px-2">
          <div
            className={`p-2 flex items-center rounded-lg w-full transition-all duration-200 ${
              isLoading 
                ? "opacity-50 cursor-not-allowed bg-gray-100" 
                : "hover:bg-red-50 hover:text-red-600 cursor-pointer"
            } ${
              collapsed ? "justify-center" : "px-3"
            }`}
            onClick={isLoading ? undefined : handleLogout}
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600"></div>
            ) : (
              <IconLogout className="min-w-5 min-h-5" stroke={1.5} />
            )}
            {!collapsed && (
              <span className="ml-3 text-sm font-medium">
                {isLoading ? "Logging out..." : "Logout"}
              </span>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <div
        className={`flex-1 transition-all duration-300 ${
          collapsed ? "ml-16" : "ml-64"
        }`}
      >
        {/* Header */}
        <header
          className={`px-6 bg-white shadow-sm flex h-16 items-center justify-between gap-4 fixed right-0 top-0 border-b border-gray-200 z-10 transition-all duration-300 ${
            collapsed ? "w-[calc(100%-4rem)]" : "w-[calc(100%-16rem)]"
          }`}
        >
          {/* Left side (Breadcrumb) */}
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <Link
                  to="/admin"
                  className="flex items-center text-blue-600 hover:text-blue-800"
                >
                  <HomeIcon size={18} aria-hidden="true" />
                  <span className="sr-only">Home</span>
                </Link>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="text-gray-800 font-medium">
                  {pageName}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {/* Right side (Notifications & Avatar) */}
          <div className="relative flex items-center gap-2">
            <NotificationCenter />
            <div className="mr-3 text-right hidden md:block">
              <p className="text-sm font-medium text-gray-800">
                {user?.fullName || user?.userName || 'Admin User'}
              </p>
              <p className="text-xs text-gray-500 capitalize">
                {user?.role?.toLowerCase().replace('_', ' ') || 'Administrator'}
              </p>
            </div>
            <div className="relative size-10">
              <img
                src={user?.avatar?.url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.fullName || user?.userName || 'Admin User')}&background=2563eb&color=fff`}
                className="rounded-full size-full border-2 border-white shadow-md object-cover"
                alt="User avatar"
              />
              <div className="absolute bg-green-500 rounded-full bottom-0 right-0 size-3 border-2 border-white"></div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="pt-20 pb-6 px-6 min-h-screen">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}