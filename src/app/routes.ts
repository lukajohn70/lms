import { createBrowserRouter } from "react-router";
import { lazy } from "react";

const Root = lazy(() => import("./pages/Root"));
const RoleSelect = lazy(() => import("./pages/RoleSelect"));
const LandingPage = lazy(() => import("./pages/website/LandingPage"));
const AdmissionsLogin = lazy(() => import("./pages/parent/AdmissionsLogin"));

// Student
const StudentLayout = lazy(() => import("./pages/student/StudentLayout"));
const StudentDashboard = lazy(() => import("./pages/student/Dashboard"));
const StudentCBT = lazy(() => import("./pages/student/CBTExam"));
const StudentCourses = lazy(() => import("./pages/student/Courses"));
const StudentMaterials = lazy(() => import("./pages/student/Materials"));
const StudentResults = lazy(() => import("./pages/student/Results"));
const StudentFees = lazy(() => import("./pages/student/Fees"));
const StudentCommunication = lazy(() => import("./pages/student/Communication"));
const StudentLibrary = lazy(() => import("./pages/student/Library"));

// Teacher
const TeacherLayout = lazy(() => import("./pages/teacher/TeacherLayout"));
const TeacherDashboard = lazy(() => import("./pages/teacher/Dashboard"));
const TeacherClasses = lazy(() => import("./pages/teacher/Classes"));
const TeacherCBT = lazy(() => import("./pages/teacher/CBTCreate"));
const TeacherMaterials = lazy(() => import("./pages/teacher/Materials"));
const TeacherAttendance = lazy(() => import("./pages/teacher/Attendance"));
const TeacherGrades = lazy(() => import("./pages/teacher/Grades"));
const TeacherAssessments = lazy(() => import("./pages/teacher/Assessments"));

// Admin
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminUsers = lazy(() => import("./pages/admin/Users"));
const AdminClasses = lazy(() => import("./pages/admin/Classes"));
const AdminCBT = lazy(() => import("./pages/admin/CBTApprovals"));
const AdminFees = lazy(() => import("./pages/admin/Fees"));
const AdminReports = lazy(() => import("./pages/admin/Reports"));
const AdminSettings = lazy(() => import("./pages/admin/Settings"));
const AdminAdmissions = lazy(() => import("./pages/admin/Admissions"));
const AdminLibrary = lazy(() => import("./pages/admin/Library"));

// Parent
const ParentLayout = lazy(() => import("./pages/parent/ParentLayout"));
const ParentDashboard = lazy(() => import("./pages/parent/Dashboard"));
const ParentPerformance = lazy(() => import("./pages/parent/Performance"));
const ParentFees = lazy(() => import("./pages/parent/Fees"));
const ParentComm = lazy(() => import("./pages/parent/Communication"));
const ParentAdmissions = lazy(() => import("./pages/parent/Admissions"));
const ParentSettings = lazy(() => import("./pages/parent/ParentSettings"));

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: LandingPage },
      { path: "login", Component: RoleSelect },
      { path: "admissions/login", Component: AdmissionsLogin },
      {
        path: "student",
        Component: StudentLayout,
        children: [
          { index: true, Component: StudentDashboard },
          { path: "cbt", Component: StudentCBT },
          { path: "courses", Component: StudentCourses },
          { path: "materials", Component: StudentMaterials },
          { path: "results", Component: StudentResults },
          { path: "fees", Component: StudentFees },
          { path: "communication", Component: StudentCommunication },
          { path: "library", Component: StudentLibrary },
        ],
      },
      {
        path: "teacher",
        Component: TeacherLayout,
        children: [
          { index: true, Component: TeacherDashboard },
          { path: "classes", Component: TeacherClasses },
          { path: "cbt", Component: TeacherCBT },
          { path: "materials", Component: TeacherMaterials },
          { path: "attendance", Component: TeacherAttendance },
          { path: "grades", Component: TeacherGrades },
          { path: "assessments", Component: TeacherAssessments },
        ],
      },
      {
        path: "admin",
        Component: AdminLayout,
        children: [
          { index: true, Component: AdminDashboard },
          { path: "users", Component: AdminUsers },
          { path: "classes", Component: AdminClasses },
          { path: "library", Component: AdminLibrary },
          { path: "admissions", Component: AdminAdmissions },
          { path: "cbt", Component: AdminCBT },
          { path: "fees", Component: AdminFees },
          { path: "reports", Component: AdminReports },
          { path: "settings", Component: AdminSettings },
        ],
      },
      {
        path: "parent",
        Component: ParentLayout,
        children: [
          { index: true, Component: ParentDashboard },
          { path: "performance", Component: ParentPerformance },
          { path: "fees", Component: ParentFees },
          { path: "communication", Component: ParentComm },
          { path: "admissions", Component: ParentAdmissions },
          { path: "settings", Component: ParentSettings },
        ],
      },
    ],
  },
]);
