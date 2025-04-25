import { Route, Routes } from "react-router-dom";
import HomePage from "./components/pages/HomePage";
// import Login from "./components/pages/Login";
import Navbar from "./components/common/Navbar";
// import { UserProvider } from "./context/UserContext";
import ZkLoginComponent from "./components/pages/ZkLogin";
import AdminPage from "./components/pages/AdminPage";

const AppRoutes = () => {
  return (
    <div>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<ZkLoginComponent />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </div>
  );
};

export default AppRoutes;
