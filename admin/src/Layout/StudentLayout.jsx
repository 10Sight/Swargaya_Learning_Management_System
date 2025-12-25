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
  IconFolder,
  IconBooks,
  IconFileText,
  IconAward,
  IconUser,
  IconMenu2,
  IconX,
  IconFileCertificate,
  IconClipboardList,
} from "@tabler/icons-react";
import { HomeIcon } from "lucide-react";
import clsx from "clsx";
import axiosInstance from "@/Helper/axiosInstance";
import useTranslate from "@/hooks/useTranslate";
import LanguageSelector from "../components/common/LanguageSelector";

const baseTabs = [
  { link: "/student", labelKey: "nav.dashboard", icon: IconLayoutDashboardFilled },
  { link: "/student/profile", labelKey: "nav.profile", icon: IconUser },
  { link: "/student/department", labelKey: "nav.department", icon: IconFolder },
  { link: "/student/course", labelKey: "nav.course", icon: IconBooks },
  { link: "/student/reports", labelKey: "nav.reports", icon: IconFileText },
  { link: "/student/certificates", labelKey: "nav.certificates", icon: IconFileCertificate }, // Modified icon for Certificates
  { link: "/student/on-job-training", labelKey: "nav.onJobTraining", icon: IconClipboardList }, // Added On Job Training
];

export function StudentLayout() {
  const [collapsed, setCollapsed] = useState(true); // Always start collapsed
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [pageName, setPageName] = useState("Dashboard");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const { t, language } = useTranslate();
  const tabs = baseTabs.map((tab) => ({ ...tab, label: t(tab.labelKey) }));

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, isLoading } = useSelector((state) => state.auth);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setCollapsed(true);
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update page name based on current route and language
  useEffect(() => {
    let cancelled = false;

    const resolvePageName = async () => {
      try {
        // Special case: reports landing/summary
        if (pathname.startsWith("/student/report")) {
          if (!cancelled) setPageName("Course Report");
          return;
        }

        // If we're on a lesson detail route, fetch the lesson title instead of showing the ID
        const lessonMatch = pathname.match(/^\/student\/lesson\/([^\/?#]+)/);
        if (lessonMatch) {
          const lessonId = lessonMatch[1];
          // Optimistic generic label while fetching
          if (!cancelled) setPageName("Lesson");
          try {
            const res = await axiosInstance.get(`/api/lessons/${lessonId}`);
            const title = res?.data?.data?.title || res?.data?.data?.name;
            if (!cancelled && title) setPageName(title);
          } catch (_) {
            // Fallback to generic label if fetch fails
            if (!cancelled) setPageName("Lesson");
          }
          return;
        }

        // Default behavior: map to known tabs or prettify last segment
        const currentTab = tabs.find(tab =>
          pathname === tab.link ||
          (tab.link !== "/student" && pathname.startsWith(tab.link))
        );

        if (currentTab) {
          if (!cancelled) setPageName(currentTab.label);
        } else if (pathname === "/student") {
          if (!cancelled) setPageName(t("nav.dashboard"));
        } else {
          const routeName = pathname.split("/").pop() || "";
          if (!cancelled) setPageName(routeName.charAt(0).toUpperCase() + routeName.slice(1));
        }
      } catch {
        // Silent: keep whatever pageName was last set
      }
    };

    resolvePageName();

    // Close mobile menu when route changes
    if (isMobile) setIsMobileMenuOpen(false);

    return () => { cancelled = true; };
  }, [pathname, isMobile, language, tabs, t]);

  const toggleSidebar = () => {
    if (isMobile) {
      setIsMobileMenuOpen((prev) => !prev);
    } else {
      setCollapsed((prev) => !prev);
    }
  };

  const handleNavigate = (link) => {
    navigate(link);
    if (isMobile) {
      setIsMobileMenuOpen(false);
    }
  };

  const handleLogout = async () => {
    try {
      await dispatch(logout()).unwrap();
      navigate("/login", { replace: true });
    } catch (error) {
      navigate("/login", { replace: true });
    }
  };


  const ToggleButton = ({ opened, onClick, ariaLabel }) => {
    if (isMobile) {
      const Icon = isMobileMenuOpen ? IconX : IconMenu2;
      return (
        <Icon
          className="w-6 h-6 transition-all cursor-pointer text-gray-600 hover:text-gray-800 md:hidden"
          onClick={onClick}
          aria-label={ariaLabel}
        />
      );
    }

    return (
      <IconLayoutSidebarRightCollapse
        className={`${opened ? "rotate-180" : "mx-auto"
          } w-5 h-5 transition-all duration-500 cursor-pointer text-gray-600 hover:text-gray-800 hidden md:block`}
        onClick={onClick}
        aria-label={ariaLabel}
      />
    );
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-green-50/30 to-emerald-50/20">
      {/* Mobile Overlay */}
      {(isMobileMenuOpen || (!collapsed && !isMobile)) && (
        <div
          className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 animate-in fade-in ${isMobile ? '' : 'md:hidden'
            }`}
          onClick={() => {
            if (isMobile) {
              setIsMobileMenuOpen(false);
            } else {
              toggleSidebar();
            }
          }}
        />
      )}

      {/* Sidebar */}
      <nav
        className={`fixed top-0 left-0 h-screen bg-white/95 backdrop-blur-xl text-black shadow-2xl transition-all duration-300 z-50 border-r border-gray-200/50 ${isMobile
          ? `${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} w-64`
          : `${collapsed ? 'w-16' : 'w-64'}`
          }`}
      >
        <div className="relative h-16 items-center flex transition-all px-4 duration-300 border-b border-gray-200/80 bg-white/50 backdrop-blur-sm">
          <ToggleButton
            opened={isMobile ? isMobileMenuOpen : !collapsed}
            onClick={toggleSidebar}
            ariaLabel="Toggle sidebar"
          />
          {((!collapsed && !isMobile) || (isMobile && isMobileMenuOpen)) && (
            <img
              src="/motherson+marelli.png"
              alt="Marelli Motherson"
              className="ml-4 h-8 w-auto object-contain"
            />
          )}
        </div>

        {/* Sidebar Navigation */}
        <div className="flex-1 overflow-y-auto px-2 py-4">
          <div className="space-y-1">
            {tabs.map((item) => {
              const isActive = pathname === item.link ||
                (item.link !== "/student" && pathname.startsWith(item.link));

              return (
                <button
                  key={item.label}
                  onClick={() => handleNavigate(item.link)}
                  className={`group relative flex items-center w-full px-3 py-3 text-sm font-medium rounded-xl transition-all duration-300 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${isActive
                    ? "bg-gradient-to-r from-green-600 to-blue-600 text-white shadow-lg shadow-green-200"
                    : "text-gray-700 hover:bg-gradient-to-r hover:from-green-50 hover:to-blue-50 hover:text-green-700 hover:shadow-md active:bg-green-100"
                    } ${(collapsed && !isMobile) ? "justify-center px-2 mx-1" : ""}`}
                >
                  {isActive && ((!collapsed && !isMobile) || isMobile) && (
                    <div className="absolute left-0 top-0 h-full w-1 bg-white rounded-r-full" />
                  )}
                  <item.icon
                    className={`shrink-0 transition-all duration-300 group-hover:scale-110 ${(collapsed && !isMobile) ? "w-6 h-6" : "w-5 h-5"
                      } ${isActive ? "text-white" : "text-gray-500 group-hover:text-green-600"}`}
                    strokeWidth={isActive ? 2.5 : 1.5}
                  />
                  {((!collapsed && !isMobile) || (isMobile)) && (
                    <span className="ml-3 truncate transition-all duration-300 group-hover:translate-x-0.5">
                      {item.label}
                    </span>
                  )}
                  {((!collapsed && !isMobile) || (isMobile)) && (
                    <div className={`ml-auto opacity-0 group-hover:opacity-100 transition-opacity ${isActive ? 'text-green-200' : 'text-gray-400'
                      }`}>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Logout */}
        <div className="border-t border-gray-200 p-2">
          <button
            onClick={isLoading ? undefined : handleLogout}
            disabled={isLoading}
            className={`group flex items-center w-full px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${isLoading
              ? "opacity-50 cursor-not-allowed bg-gray-100 text-gray-400"
              : "text-gray-700 hover:bg-red-50 hover:text-red-600 active:bg-red-100"
              } ${(collapsed && !isMobile) ? "justify-center px-2" : ""}`}
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-red-600 border-t-transparent shrink-0"></div>
            ) : (
              <IconLogout className={`shrink-0 transition-colors ${(collapsed && !isMobile) ? "w-6 h-6" : "w-5 h-5"
                } text-gray-500 group-hover:text-red-600`} stroke={1.5} />
            )}
            {((!collapsed && !isMobile) || (isMobile)) && (
              <span className="ml-3 truncate transition-all duration-300">
                {isLoading ? t("auth.signingOut") : t("auth.signOut")}
              </span>
            )}
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <div
        className={`flex-1 transition-all duration-300 ${isMobile
          ? "ml-0"
          : collapsed
            ? "ml-16"
            : "ml-64"
          }`}
      >
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 sm:px-6">
            {/* Left side - Mobile menu button and Breadcrumb */}
            <div className="flex items-center gap-4">
              {isMobile && (
                <button
                  onClick={toggleSidebar}
                  className="p-2 -ml-2 rounded-lg text-gray-600 hover:text-gray-800 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 md:hidden"
                  aria-label="Toggle navigation"
                >
                  <IconMenu2 className="w-6 h-6" />
                </button>
              )}

              <Breadcrumb className="hidden sm:block">
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <Link
                      to="/student"
                      className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      <HomeIcon size={16} aria-hidden="true" />
                      <span className="sr-only">Home</span>
                    </Link>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="text-gray-800 font-medium text-sm">
                      {pageName}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>

              {/* Mobile page title */}
              <h1 className="text-lg font-semibold text-gray-900 sm:hidden">
                {pageName}
              </h1>
            </div>

            {/* Right side - User info and avatar */}
            <div className="flex items-center gap-3">
              <LanguageSelector />
              <div className="hidden lg:block text-right">
                <p className="text-sm font-medium text-gray-900 leading-tight">
                  {user?.fullName || user?.userName || 'Student'}
                </p>
                <p className="text-xs text-gray-500 capitalize">
                  {user?.role?.toLowerCase().replace('_', ' ') || 'Student'}
                </p>
              </div>

              <div className="relative">
                <img
                  src={user?.avatar?.url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.fullName || user?.userName || 'Student')}&background=2563eb&color=fff`}
                  className="w-10 h-10 rounded-full border-2 border-white shadow-md object-cover ring-2 ring-gray-100"
                  alt="User avatar"
                />
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1">
          <div className="max-w-7xl mx-auto px-2.5 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
