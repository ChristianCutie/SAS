import { Outlet } from "react-router-dom";
function DashboardLayout() {
    return (
        <main className="flex-1 p-6">
            <Outlet />
        </main>

    );
}

export default DashboardLayout

