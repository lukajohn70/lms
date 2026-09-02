import { Outlet } from "react-router";
import { Layout } from "../../components/Layout";

export default function AdminLayout() {
  return <Layout><Outlet /></Layout>;
}
