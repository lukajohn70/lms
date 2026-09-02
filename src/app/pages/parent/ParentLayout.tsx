import { Outlet } from "react-router";
import { Layout } from "../../components/Layout";

export default function ParentLayout() {
  return <Layout><Outlet /></Layout>;
}
