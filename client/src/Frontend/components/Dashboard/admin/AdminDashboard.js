import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import { CSVLink } from "react-csv";
import AdminSidebar from "./AdminSidebar";
import "react-toastify/dist/ReactToastify.css";
import "../../styles/admin.css";

const API_URL =
    process.env.REACT_APP_API_URL ||
    (window.location.hostname === "localhost"
        ? "http://localhost:4000"
        : "https://financial-ai-backend-kr2s.onrender.com");

// Admin access (route guard + role check) is enforced by <AdminRoute>, which
// relies on the backend-verified role from AuthContext — no localStorage checks here.
const AdminDashboard = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const usersPerPage = 6;

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await axios.get(`${API_URL}/api/users/all`, {
                    withCredentials: true,
                });
                setUsers(Array.isArray(res.data) ? res.data : []);
            } catch (err) {
                toast.error("Failed to load users.");
            }
        };

        fetchUsers();
    }, []);

    const handleToggleBlock = async (id) => {
        try {
            await axios.put(
                `${API_URL}/api/users/toggle-block/${id}`,
                {},
                { withCredentials: true }
            );
            toast.success("User status updated.");
            setUsers((prev) =>
                prev.map((u) => (u._id === id ? { ...u, blocked: !u.blocked } : u))
            );
        } catch (err) {
            toast.error("Failed to update user status.");
        }
    };

    const handleDeleteUser = async (id) => {
        try {
            await axios.delete(`${API_URL}/api/users/delete/${id}`, {
                withCredentials: true,
            });
            toast.success("User deleted.");
            setUsers((prev) => prev.filter((u) => u._id !== id));
        } catch (err) {
            toast.error("Failed to delete user.");
        }
    };

    const filteredUsers = users.filter((user) =>
        user.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const indexOfLast = currentPage * usersPerPage;
    const indexOfFirst = indexOfLast - usersPerPage;
    const currentUsers = filteredUsers.slice(indexOfFirst, indexOfLast);
    const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

    const csvHeaders = [
        { label: "Username", key: "username" },
        { label: "Email", key: "email" },
        { label: "Role", key: "role" },
        { label: "Status", key: "blocked" },
        { label: "Created At", key: "createdAt" },
    ];

    return (
        <div className="admin-page-container">
            <AdminSidebar />

            <div className="admin-dashboard">
                <ToastContainer />
                <h1>Admin Dashboard</h1>

                <div className="admin-cards">
                    <div className="admin-card">👥 Users: {users.length}</div>
                    <div className="admin-card">
                        <CSVLink
                            data={users}
                            headers={csvHeaders}
                            filename="users.csv"
                            className="export-btn"
                        >
                            📤 Export CSV
                        </CSVLink>
                    </div>
                </div>

                <div className="top-controls">
                    <input
                        type="text"
                        placeholder="Search username..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="search-input"
                    />
                </div>

                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Username</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th>Joined</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentUsers.map((u) => (
                            <tr key={u._id}>
                                <td>{u.username}</td>
                                <td>{u.email}</td>
                                <td>{u.role}</td>
                                <td>
                                    <span className={`status-badge ${u.blocked ? "blocked" : "active"}`}>
                                        {u.blocked ? "Blocked" : "Active"}
                                    </span>
                                </td>
                                <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                                <td>
                                    <button
                                        className={`block-btn ${u.blocked ? "unblock" : ""}`}
                                        onClick={() => handleToggleBlock(u._id)}
                                    >
                                        {u.blocked ? "Unblock" : "Block"}
                                    </button>
                                    <button className="delete-btn" onClick={() => handleDeleteUser(u._id)}>
                                        Delete
                                    </button>
                                    <button
                                        className="view-btn"
                                        onClick={() => navigate(`/admin/users/${u._id}`)}
                                    >
                                        View
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="pagination">
                    {Array.from({ length: totalPages }, (_, i) => (
                        <button
                            key={i}
                            onClick={() => setCurrentPage(i + 1)}
                            className={currentPage === i + 1 ? "active" : ""}
                        >
                            {i + 1}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
