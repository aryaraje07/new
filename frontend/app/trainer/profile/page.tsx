"use client";

import { useEffect, useState } from "react";
import API from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Camera, Edit, Save } from 'lucide-react';

export default function TrainerProfile() {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const res = await API.get("/auth/profile");
    setFormData(res.data);
  };

  const handleSave = async () => {
    await API.put("/auth/profile", formData);
    setIsEditing(false);
    alert("Profile updated successfully!");
  };

  if (!formData) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-10 space-y-10 max-w-5xl mx-auto">

  {/* Header */}
  <div className="space-y-2 animate-[fadeIn_0.4s_ease-out]">
    <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
      Profile
    </h1>
    <p className="text-gray-600 text-sm">
      Manage your profile information
    </p>
  </div>

  <Card className="relative overflow-hidden border border-gray-200 shadow-sm hover:shadow transition-shadow duration-300 rounded-xl bg-white">
    
    {/* Top Accent */}
    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-400" />

    <div className="p-8 space-y-8">

      {/* Avatar + Trainer ID */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">

        <div className="flex items-center gap-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg overflow-hidden bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center">
              <span className="text-2xl font-semibold text-white">
                VE
              </span>
            </div>
            {isEditing && (
              <button
                onClick={() => document.getElementById('profile-image-upload')?.click()}
                className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-white border border-gray-300 shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors duration-200 group"
              >
                <Camera className="w-4 h-4 text-gray-600 group-hover:text-indigo-600" />
              </button>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                Employee ID
              </p>
              <p className="text-xl font-semibold text-gray-900 tracking-tight">
                {formData.employeeId || formData.facultyId || "N/A"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-sm text-gray-600">Active</span>
            </div>
          </div>
        </div>

        {!isEditing && (
          <Button
            onClick={() => setIsEditing(true)}
            className="bg-indigo-600 hover:bg-indigo-700 px-5 h-10 rounded-lg shadow-sm text-sm font-medium transition-colors duration-200 hover:shadow"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200 pt-8">

        <div className="flex items-center gap-2 mb-6">
          <div className="w-1 h-6 bg-gray-800 rounded-full"></div>
          <h2 className="text-lg font-medium text-gray-900">
            Basic Information
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Full Name */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 mb-1">
              Full Name
            </Label>
            <div className={`text-base font-semibold ${!isEditing ? 'text-gray-900' : ''}`}>
              {!isEditing ? (
                <p className="text-gray-900 font-medium text-lg">{formData.fullName}</p>
              ) : (
                <Input
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      fullName: e.target.value,
                    })
                  }
                  className="h-10 rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors duration-200"
                />
              )}
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 mb-1">
              Email
            </Label>
            <div className={`text-base font-semibold ${!isEditing ? 'text-gray-900' : ''}`}>
              {!isEditing ? (
                <p className="text-gray-900 font-medium text-lg">{formData.email || 'N/A'}</p>
              ) : (
                <Input
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      email: e.target.value,
                    })
                  }
                  className="h-10 rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors duration-200"
                />
              )}
            </div>
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 mb-1">
              Phone
            </Label>
            <div className={`text-base font-semibold ${!isEditing ? 'text-gray-900' : ''}`}>
              {!isEditing ? (
                <p className="text-gray-900 font-medium text-lg">{formData.phone}</p>
              ) : (
                <Input
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      phone: e.target.value,
                    })
                  }
                  className="h-10 rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors duration-200"
                />
              )}
            </div>
          </div>

          {/* Department */}
          {/* <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 mb-1">
              Department
            </Label>
            <div className={`text-base font-semibold ${!isEditing ? 'text-gray-900' : ''}`}>
              {!isEditing ? (
                <p className="text-gray-900 font-medium text-lg">{formData.department || 'Computer Science'}</p>
              ) : (
                <Input
                  value={formData.department}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      department: e.target.value,
                    })
                  }
                  className="h-10 rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors duration-200"
                />
              )}
            </div>
          </div> */}

        </div>

        {/* Buttons */}
        {isEditing && (
          <div className="flex gap-3 mt-8 pt-6 border-t border-gray-200">
            <Button
              onClick={handleSave}
              className="bg-indigo-600 hover:bg-indigo-700 px-5 h-10 rounded-lg shadow-sm text-sm font-medium transition-colors duration-200 hover:shadow"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>

            <Button
              variant="outline"
              onClick={() => setIsEditing(false)}
              className="h-10 rounded-lg px-5 text-sm font-medium border-gray-300 hover:bg-gray-50 transition-colors duration-200"
            >
              Cancel
            </Button>
          </div>
        )}

      </div>
    </div>
  </Card>
</div>

  );
}
