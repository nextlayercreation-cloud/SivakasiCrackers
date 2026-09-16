import React, { useEffect, useState } from 'react';
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc
} from 'firebase/firestore';

import { db } from '../firebase';
import '../styles/index.css';
import SearchableSelect from '../components/SelectableSearch';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [admins, setAdmins] = useState([]);

  const [selectedUser, setSelectedUser] = useState('');
  const [selectedAdmin, setSelectedAdmin] = useState('');

  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  const loadData = async () => {
    try {
      const usersSnapshot = await getDocs(
        collection(db, 'users')
      );

      const adminsSnapshot = await getDocs(
        collection(db, 'admins')
      );

      const userList = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const adminList = adminsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setUsers(userList);
      setAdmins(adminList);
    } catch (error) {
      console.error(error);
      alert('Failed loading data');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddAdmin = async () => {
    try {
      const username = adminUsername.trim();
      const password = adminPassword.trim();

      if (!username) {
        alert('Enter Admin Username');
        return;
      }

      if (!password) {
        alert('Enter Admin Password');
        return;
      }

      if (password.length < 6) {
        alert(
          'Password must be at least 6 characters'
        );
        return;
      }

      const exists = admins.some(
        admin =>
          admin.email?.toLowerCase() ===
          username.toLowerCase()
      );

      if (exists) {
        alert('Admin already exists');
        return;
      }

      await addDoc(
        collection(db, 'admins'),
        {
          email: username,
          password: password,
          role: 'admin',
          createdAt: new Date().toISOString()
        }
      );

      setAdminUsername('');
      setAdminPassword('');

      alert('Admin Added Successfully');

      loadData();
    } catch (error) {
      console.error(error);
      alert('Failed adding admin');
    }
  };

  const handleDeleteUser = async () => {
    try {
      if (!selectedUser) {
        alert('Select a user');
        return;
      }

      const user = users.find(
        u => u.id === selectedUser
      );

      const confirmed = window.confirm(
        `Delete user ${
          user?.name ||
          user?.email ||
          user?.phone ||
          selectedUser
        } permanently?`
      );

      if (!confirmed) return;

      await deleteDoc(
        doc(db, 'users', selectedUser)
      );

      setSelectedUser('');

      alert('User Deleted Successfully');

      loadData();
    } catch (error) {
      console.error(error);
      alert('Failed deleting user');
    }
  };

  const handleDeleteAdmin = async () => {
    try {
      if (!selectedAdmin) {
        alert('Select an admin');
        return;
      }

      const admin = admins.find(
        a => a.id === selectedAdmin
      );

      if (
        admin?.email?.toLowerCase() ===
        'admin@crackers.com'
      ) {
        alert(
          'Default Admin cannot be deleted'
        );
        return;
      }

      const confirmed = window.confirm(
        `Delete admin ${
          admin?.email || selectedAdmin
        } permanently?`
      );

      if (!confirmed) return;

      await deleteDoc(
        doc(db, 'admins', selectedAdmin)
      );

      setSelectedAdmin('');

      alert('Admin Deleted Successfully');

      loadData();
    } catch (error) {
      console.error(error);
      alert('Failed deleting admin');
    }
  };

  return (
  <div className="user-management">
    <h2 className="user-management-title">
      User & Admin Management
    </h2>

    <div className="management-grid">

      <div className="management-card">
        <h3>Add New Admin</h3>

        <input
          className="management-input"
          type="text"
          placeholder="Admin Username"
          value={adminUsername}
          onChange={(e) =>
            setAdminUsername(e.target.value)
          }
        />

        <input
          className="management-input"
          type="password"
          placeholder="Admin Password"
          value={adminPassword}
          onChange={(e) =>
            setAdminPassword(e.target.value)
          }
        />

        <button
          className="management-btn management-btn-add"
          onClick={handleAddAdmin}
        >
          Add Admin
        </button>

        <div className="management-info">
          Current Admins:
          <span className="admin-count">
            {' '} {admins.length}
          </span>
        </div>
      </div>

      <div className="management-card">
        <h3>Delete User</h3>
        <div className="management-search">
        <SearchableSelect
          options={users.map(user => ({
              label:
              user.name ||
              user.email ||
              user.phone ||
              user.id,
              value: user.id
            }))}
            value={selectedUser}
            onChange={setSelectedUser}
            placeholder="Search User..."
            />
        </div>

        <button
          className="management-btn management-btn-delete"
          onClick={handleDeleteUser}
        >
          Delete User
        </button>

        <div className="management-info">
          Total Users:
          <span className="user-count">
            {' '} {users.length}
          </span>
        </div>
      </div>

      <div className="management-card">
        <h3>Delete Admin</h3>

        <div className="management-search">
        <SearchableSelect
          options={admins.map(admin => ({
              label: admin.email,
              value: admin.id
            }))}
            value={selectedAdmin}
            onChange={setSelectedAdmin}
            placeholder="Search Admin..."
            />
        </div>

        <button
          className="management-btn management-btn-delete"
          onClick={handleDeleteAdmin}
        >
          Delete Admin
        </button>

        <div className="management-info">
          Protected:
          <strong> admin@crackers.com</strong>
        </div>
      </div>

    </div>
  </div>
);
}