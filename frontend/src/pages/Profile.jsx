import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import toast from 'react-hot-toast';

const Profile = () => {
  const { user, fetchUser, axios } = useAppContext();
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    image: user?.image || ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'image' && files && files[0]) {
      setForm({ ...form, image: files[0] });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let imageUrl = form.image;
      if (form.image && form.image instanceof File) {
        // Upload image
        const data = new FormData();
        data.append('image', form.image);
        const res = await axios.post('/api/owner/update-image', data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        if (res.data.success) {
          imageUrl = res.data.image;
        } else {
          toast.error(res.data.message);
        }
      }
      const { data } = await axios.put('/api/user/edit', {
        userId: user._id,
        name: form.name,
        email: form.email,
        image: imageUrl
      });
      if (data.success) {
        toast.success('Profile updated');
        setEditMode(false);
        fetchUser();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <div className="flex justify-center items-center h-40">Loading...</div>;

  return (
    <div className="max-w-lg mx-auto p-6 bg-white rounded-xl shadow mt-10">
      <h2 className="text-2xl font-bold mb-6 text-primary">Profile</h2>
      <div className="flex flex-col items-center mb-6">
        <img
          src={user.image || '/src/assets/user_profile.jpg'}
          alt="Profile"
          className="w-24 h-24 rounded-full object-cover border-2 border-primary mb-2"
        />
        <button
          className="text-pink-500 hover:underline text-sm"
          onClick={() => setEditMode((v) => !v)}
        >
          {editMode ? 'Cancel' : 'Edit Profile'}
        </button>
      </div>
      {editMode ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-primary-dull mb-1">Name</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              className="border border-borderColor rounded w-full p-2"
              required
            />
          </div>
          <div>
            <label className="block text-primary-dull mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="border border-borderColor rounded w-full p-2"
              required
            />
          </div>
          <div>
            <label className="block text-primary-dull mb-1">Profile Image</label>
            <input
              type="file"
              name="image"
              accept="image/*"
              onChange={handleChange}
              className="border border-borderColor rounded w-full p-2"
            />
          </div>
          <button
            type="submit"
            className="bg-primary text-white py-2 rounded hover:bg-primary-dull transition"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      ) : (
        <div className="flex flex-col gap-2">
          <div><span className="font-semibold text-primary-dull">Name:</span> {user.name}</div>
          <div><span className="font-semibold text-primary-dull">Email:</span> {user.email}</div>
        </div>
      )}
    </div>
  );
};

export default Profile;