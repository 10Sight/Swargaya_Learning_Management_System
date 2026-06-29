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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { logout } from "@/Redux/Slice/AuthSlice";
import {
  IconLayoutDashboardFilled,
  IconLayoutSidebarRightCollapse,
  IconLogout,
  IconCertificate,
  IconFolder,
  IconUsers,
  IconClipboardList,
  IconClipboard,
  IconUser,
  IconSettings,
  IconMenu2,
  IconDownload,
} from "@tabler/icons-react";
import { HomeIcon, Command } from "lucide-react";
import { useUpdateAvatarMutation } from "@/Redux/AllApi/UserApi";
import { profile as fetchProfile } from "@/Redux/Slice/AuthSlice";
import useTranslate from "@/hooks/useTranslate";
import LanguageSelector from "../components/common/LanguageSelector";

const baseTabs = [
  { link: "/trainer", labelKey: "nav.dashboard", icon: IconLayoutDashboardFilled },
  { link: "/trainer/courses", labelKey: "nav.myCourses", icon: IconCertificate },
  { link: "/trainer/departments", labelKey: "nav.myDepartments", icon: IconFolder },
  { link: "/trainer/employees", labelKey: "nav.students", icon: IconUsers },
  { link: "/trainer/quiz-monitoring", labelKey: "nav.quizManagement", icon: IconClipboardList },
  { link: "/trainer/attempt-requests", labelKey: "nav.attemptRequests", icon: IconClipboardList },
  { link: "/trainer/assignment-monitoring", labelKey: "nav.assignmentManagement", icon: IconClipboard },
  { link: "/trainer/skill-matrix", labelKey: "nav.skillMatrix", icon: IconUsers },

];

export function InstructorLayout() {
  const [collapsed, setCollapsed] = useState(
    window.innerWidth >= 820 ? false : true
  );

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [pageName, setPageName] = useState("Dashboard");
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const { t, language } = useTranslate();
  const tabs = baseTabs.map((tab) => ({ ...tab, label: t(tab.labelKey) }));

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, isLoading } = useSelector((state) => state.auth);
  const [updateAvatar] = useUpdateAvatarMutation();
  const avatarFileRef = React.useRef(null);
  const pickAvatar = () => avatarFileRef.current?.click();
  const onAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Please select an image'); e.target.value = ''; return; }
    const form = new FormData(); form.append('avatar', file);
    try { await updateAvatar(form).unwrap(); await dispatch(fetchProfile()).unwrap(); }
    catch (err) { alert(err?.data?.message || 'Failed to update avatar'); }
    finally { e.target.value = ''; }
  };

  // Update page name based on current route and language
  useEffect(() => {
    const currentTab = tabs.find(tab =>
      pathname === tab.link ||
      (tab.link !== "/trainer" && pathname.startsWith(tab.link))
    );

    if (currentTab) {
      setPageName(currentTab.label);
    } else if (pathname === "/trainer") {
      setPageName(t("nav.dashboard"));
    } else {
      // For nested routes, you might want to extract from pathname
      const routeName = pathname.split("/").pop();
      setPageName(routeName.charAt(0).toUpperCase() + routeName.slice(1));
    }
  }, [pathname, language, tabs, t]);

  // Handle window resize for responsive behavior
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);

      // Auto-collapse on mobile, auto-expand on desktop
      if (mobile) {
        setCollapsed(true);
      } else if (window.innerWidth >= 1024) {
        setCollapsed(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert("To install the app:\n1. Desktop: Click the install icon in the address bar (if available) or look in the browser menu.\n2. Mobile: Tap 'Share' -> 'Add to Home Screen'.\n\n(Note: This functionality requires PWA configuration which might not be fully active in development mode)");
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setDeferredPrompt(null);
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
    <div className="flex min-h-screen" style={{ background: 'linear-gradient(to bottom right, #f8fafc, rgba(240, 253, 244, 0.3), rgba(239, 246, 255, 0.2))' }}>
      {/* Mobile overlay */}
      {!collapsed && isMobile && (
        <div
          className="fixed inset-0 backdrop-blur-sm z-10 md:hidden animate-in fade-in duration-300"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <nav
        className={`fixed top-0 left-0 h-screen backdrop-blur-xl transition-all duration-300 z-20
                ${collapsed ? "w-16" : "w-64"} 
                ${isMobile && !collapsed ? 'shadow-3xl border-r-2' : ''}`}
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderRight: '1px solid rgba(229, 231, 235, 0.5)',
          color: '#000000',
          boxShadow: 'var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), 0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}
      >
        <div
          className={`relative h-16 items-center flex transition-all p-4 duration-300 z-50`}
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
            <img
              src="/motherson+marelli.png"
              alt="Marelli Motherson"
              className="ml-4 h-8 w-auto object-contain"
            />
          )}
        </div>

        {/* Sidebar Tabs */}
        <div className="px-3 flex flex-col w-full py-6 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[#d1d5db]">
          {tabs.map((item) => {
            const isActive =
              pathname === item.link ||
              (item.link === "/trainer" && pathname === "/trainer") ||
              (item.link !== "/trainer" && pathname.startsWith(item.link));

            return (
              <div
                className={`group relative flex items-center cursor-pointer w-full overflow-hidden h-12 rounded-xl transition-all duration-300 hover:scale-[1.02]
                ${collapsed ? "justify-center mx-1" : "items-center px-4"}`}
                style={{
                  background: isActive ? 'linear-gradient(to right, #16a34a, #2563eb)' : 'transparent',
                  color: isActive ? '#ffffff' : '#4b5563',
                  boxShadow: isActive ? '0 10px 15px -3px rgba(187, 247, 208, 1)' : 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'linear-gradient(to right, #f0fdf4, #eff6ff)';
                    e.currentTarget.style.color = '#15803d';
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
                key={item.label}
                onClick={() => {
                  navigate(item.link);
                  if (isMobile) setCollapsed(true);
                }}
              >
                {isActive && !collapsed && (
                  <div className="absolute left-0 top-0 h-full w-1 rounded-r-full" style={{ backgroundColor: '#ffffff' }} />
                )}
                <item.icon
                  className={`${collapsed ? "w-5 h-5" : "min-w-5 min-h-5"
                    } transition-transform group-hover:scale-110`}
                  strokeWidth={isActive ? 2.5 : 1.5}
                />
                {!collapsed && (
                  <span className="ml-3 text-sm font-medium transition-all group-hover:translate-x-0.5">
                    {item.label}
                  </span>
                )}
                {!collapsed && (
                  <div className={`ml-auto opacity-0 group-hover:opacity-100 transition-opacity ${isActive ? 'text-[#bbf7d0]' : 'text-[#9ca3af]'
                    }`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Logout */}
        <div className="absolute bottom-6 w-full px-3">
          <div
            className={`group p-3 flex items-center rounded-xl w-full transition-all duration-300 ${isLoading
              ? "opacity-50 cursor-not-allowed bg-[#f3f4f6]"
              : "hover:bg-gradient-to-r hover:from-[#fef2f2] hover:to-[#fdf2f8] hover:text-[#dc2626] cursor-pointer hover:shadow-md"
              } ${collapsed ? "justify-center mx-1" : "px-4"
              }`}
            onClick={isLoading ? undefined : handleLogout}
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#dc2626]"></div>
            ) : (
              <IconLogout className="min-w-5 min-h-5 transition-transform group-hover:scale-110" stroke={1.5} />
            )}
            {!collapsed && (
              <span className="ml-3 text-sm font-medium transition-all group-hover:translate-x-0.5">
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
          {/* Mobile menu button */}
          <div className="flex items-center gap-3">
            {isMobile && (
              <button
                onClick={toggleSidebar}
                className="p-2 rounded-lg hover:bg-[#f3f4f6] transition-colors md:hidden"
                aria-label="Toggle menu"
              >
                <IconMenu2 className="w-5 h-5 text-[#4b5563]" />
              </button>
            )}

            {/* Breadcrumb */}
            <Breadcrumb className="hidden sm:block">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <Link
                    to="/trainer"
                    className="flex items-center text-[#16a34a] hover:text-[#15803d] transition-colors"
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

            {/* Mobile page title */}
            <h1 className="font-semibold text-[#1f2937] text-lg sm:hidden">
              {pageName}
            </h1>
          </div>

          {/* Right side (Search & Avatar) */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Install App Button - Desktop & Mobile */}
            <Button
              variant="ghost"
              size="icon"
              className="hidden sm:flex hover:bg-[#f3f4f6] text-[#4b5563] hover:text-[#1f2937] transition-colors"
              onClick={handleInstallClick}
              title="Install App"
            >
              <IconDownload className="h-4 w-4" />
            </Button>
            {/* Language Selector */}
            <LanguageSelector />
            {/* User Dropdown Menu */}
            <input ref={avatarFileRef} type="file" accept="image/*" className="hidden" onChange={onAvatarChange} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:ring-2 hover:ring-[#bbf7d0] transition-all">
                  <Avatar className="h-9 w-9">
                    <AvatarImage
                      src={user?.avatar?.url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.fullName || user?.userName || 'Instructor')}&background=059669&color=fff`}
                      alt={user?.fullName || user?.userName || 'Instructor'}
                    />
                    <AvatarFallback className="bg-gradient-to-r from-[#22c55e] to-[#2563eb] text-[#ffffff]">
                      {(user?.fullName || user?.userName || 'IN').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute bg-[#22c55e] rounded-full bottom-0 right-0 size-2.5 border-2 border-[#ffffff] animate-pulse"></div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64 p-2" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-[#111827]">
                        {user?.fullName || user?.userName || 'Instructor'}
                      </p>
                      <Badge variant="outline" className="text-xs border-[#bbf7d0] text-[#15803d]">
                        {user?.role?.toLowerCase().replace('_', ' ') || 'Instructor'}
                      </Badge>
                    </div>
                    <p className="text-xs text-[#6b7280]">
                      {user?.email || 'instructor@sarvagaya.edu'}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer hover:bg-[#f0fdf4]" onClick={pickAvatar}>
                  <IconUser className="mr-2 h-4 w-4" />
                  {t("profile.changeProfilePicture")}
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer hover:bg-[#f0fdf4]">
                  <IconSettings className="mr-2 h-4 w-4" />
                  {t("settings.accountSettings")}
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer hover:bg-[#f0fdf4]">
                  <Command className="mr-2 h-4 w-4" />
                  {t("ui.keyboardShortcuts")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer hover:bg-[#fef2f2] text-[#dc2626] focus:text-[#dc2626]"
                  onClick={handleLogout}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="mr-2 animate-spin rounded-full h-4 w-4 border-b-2 border-[#dc2626]"></div>
                  ) : (
                    <IconLogout className="mr-2 h-4 w-4" />
                  )}
                  {isLoading ? t("auth.signingOut") : t("auth.signOut")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <div className="pt-20 pb-6 px-4 sm:px-6 min-h-screen">
          <div className="backdrop-blur-sm rounded-xl shadow-sm p-4 sm:p-6 transition-all duration-300 hover:shadow-md"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
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