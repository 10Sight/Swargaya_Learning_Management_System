import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { IconUser, IconMail, IconPhone, IconCalendar, IconSchool, IconCamera } from '@tabler/icons-react';
import AccountStatusNotification from '../../components/student/AccountStatusNotification';
import AccountStatusWrapper from '../../components/student/AccountStatusWrapper';
import { useUpdateAvatarMutation } from '@/Redux/AllApi/UserApi';
import { profile } from '@/Redux/Slice/AuthSlice';

const Profile = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [updateAvatar, { isLoading: uploading }] = useUpdateAvatarMutation();
  const fileRef = React.useRef(null);
  const [preview, setPreview] = React.useState(null);

  const onPickImage = () => fileRef.current?.click();
  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please choose an image file.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const onUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('avatar', file);
    try {
      await updateAvatar(form).unwrap();
      await dispatch(profile()).unwrap();
      setPreview(null);
      if (fileRef.current) fileRef.current.value = '';
      alert('Profile picture updated');
    } catch (e) {
      alert(e?.data?.message || 'Failed to update avatar');
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2563eb]"></div>
      </div>
    );
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Not available';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'ACTIVE': { color: 'bg-[#dcfce7] text-[#166534]', text: 'Active' },
      'PENDING': { color: 'bg-[#fef9c3] text-[#854d0e]', text: 'Pending Approval' },
      'SUSPENDED': { color: 'bg-[#ffedd5] text-[#9a3412]', text: 'Suspended' },
      'BANNED': { color: 'bg-[#fee2e2] text-[#991b1b]', text: 'Banned' }
    };

    const config = statusConfig[status] || { color: 'bg-[#f3f4f6] text-[#1f2937]', text: status };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  return (
    <AccountStatusWrapper allowPending={true}>
      <div className="max-w-4xl mx-auto">
        {/* Account Status Notification */}
        {user.status !== 'ACTIVE' && (
          <AccountStatusNotification status={user.status} />
        )}

        <div className="bg-white shadow-lg rounded-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#3b82f6] to-[#2563eb] px-6 py-8">
            <div className="flex items-center space-x-6">
              <div className="relative">
                <img
                  src={preview || user.avatar?.url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName || user.userName)}&background=ffffff&color=2563eb&size=128`}
                  alt="Profile"
                  className="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover"
                />
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
                <button
                  type="button"
                  onClick={onPickImage}
                  className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-white text-[#2563eb] rounded-full p-2 shadow hover:bg-[#eff6ff]"
                  title="Change profile picture"
                >
                  <IconCamera className="w-4 h-4" />
                </button>
                {preview && (
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={onUpload}
                      disabled={uploading}
                      className="px-3 py-1 bg-[#2563eb] text-white rounded hover:bg-[#1d4ed8] text-xs"
                    >
                      {uploading ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setPreview(null); if (fileRef.current) fileRef.current.value = ''; }}
                      className="px-3 py-1 bg-[#e5e7eb] text-[#1f2937] rounded hover:bg-[#d1d5db] text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                )}
                <div className="absolute -bottom-2 -right-2">
                  {getStatusBadge(user.status)}
                </div>
              </div>
              <div className="text-white">
                <h1 className="text-3xl font-bold mb-2">{user.fullName}</h1>
                <p className="text-[#dbeafe] text-lg">@{user.userName}</p>
                <p className="text-[#bfdbfe] capitalize">{user.role?.toLowerCase()}</p>
              </div>
            </div>
          </div>

          {/* Profile Information */}
          <div className="p-6">
            <h2 className="text-xl font-semibold text-[#111827] mb-6 flex items-center">
              <IconUser className="w-5 h-5 mr-2 text-[#2563eb]" />
              Personal Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div className="flex items-center p-4 bg-[#f9fafb] rounded-lg">
                  <IconUser className="w-5 h-5 text-[#6b7280] mr-3" />
                  <div>
                    <p className="text-sm text-[#6b7280]">Full Name</p>
                    <p className="font-medium text-[#111827]">{user.fullName}</p>
                  </div>
                </div>

                <div className="flex items-center p-4 bg-[#f9fafb] rounded-lg">
                  <IconMail className="w-5 h-5 text-[#6b7280] mr-3" />
                  <div>
                    <p className="text-sm text-[#6b7280]">Email Address</p>
                    <p className="font-medium text-[#111827]">{user.email}</p>
                  </div>
                </div>

                <div className="flex items-center p-4 bg-[#f9fafb] rounded-lg">
                  <IconPhone className="w-5 h-5 text-[#6b7280] mr-3" />
                  <div>
                    <p className="text-sm text-[#6b7280]">Phone Number</p>
                    <p className="font-medium text-[#111827]">{user.phoneNumber}</p>
                  </div>
                </div>
              </div>

              {/* Account Info */}
              <div className="space-y-4">
                <div className="flex items-center p-4 bg-[#f9fafb] rounded-lg">
                  <IconCalendar className="w-5 h-5 text-[#6b7280] mr-3" />
                  <div>
                    <p className="text-sm text-[#6b7280]">Member Since</p>
                    <p className="font-medium text-[#111827]">{formatDate(user.createdAt)}</p>
                  </div>
                </div>

                <div className="flex items-center p-4 bg-[#f9fafb] rounded-lg">
                  <IconCalendar className="w-5 h-5 text-[#6b7280] mr-3" />
                  <div>
                    <p className="text-sm text-[#6b7280]">Last Login</p>
                    <p className="font-medium text-[#111827]">{formatDate(user.lastLogin)}</p>
                  </div>
                </div>

                <div className="flex items-center p-4 bg-[#f9fafb] rounded-lg">
                  <IconSchool className="w-5 h-5 text-[#6b7280] mr-3" />
                  <div>
                    <p className="text-sm text-[#6b7280]">Account Status</p>
                    <div className="mt-1">
                      {getStatusBadge(user.status)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Status Information */}
            {user.status !== 'ACTIVE' && (
              <div className="mt-8 p-6 bg-[#f9fafb] rounded-lg">
                <h3 className="text-lg font-medium text-[#111827] mb-3">Account Status Information</h3>
                {user.status === 'PENDING' && (
                  <p className="text-[#374151]">
                    Your account is currently pending approval from an administrator. Once approved,
                    you will have full access to all learning materials and features.
                  </p>
                )}
                {user.status === 'SUSPENDED' && (
                  <p className="text-[#374151]">
                    Your account has been suspended. This may be temporary. Please contact your
                    instructor or administrator for more information about restoring your access.
                  </p>
                )}
                {user.status === 'BANNED' && (
                  <p className="text-[#374151]">
                    Your account has been banned from the platform. Please contact your instructor
                    or administrator if you believe this is an error.
                  </p>
                )}
              </div>
            )}

            {/* Contact Information */}
            <div className="mt-8 p-6 bg-[#eff6ff] border border-[#bfdbfe] rounded-lg">
              <h3 className="text-lg font-medium text-[#1e3a8a] mb-2">Need Help?</h3>
              <p className="text-[#1d4ed8]">
                If you have any questions about your account or need assistance,
                please contact your instructor or the system administrator.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AccountStatusWrapper>
  );
};

export default Profile;
