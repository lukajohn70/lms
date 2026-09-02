import { Outlet } from "react-router";
import { Layout } from "../../components/Layout";

export default function StudentLayout() {
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}
