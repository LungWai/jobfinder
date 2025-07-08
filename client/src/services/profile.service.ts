import api from './api';
import { 
  UserProfile,
  User,
  ApiResponse
} from '../types/api';

interface UpdateProfileRequest {
  bio?: string;
  location?: string;
  phone?: string;
  skills?: string[];
  experience?: string;
  education?: string;
  preferredJobCategories?: string[];
  preferredLocations?: string[];
  expectedSalaryMin?: number;
  expectedSalaryMax?: number;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
}

interface ProfileCompleteness {
  percentage: number;
  missingFields: string[];
  suggestions: string[];
}

export const profileService = {
  // Get user profile
  getProfile: async (): Promise<UserProfile> => {
    const response = await api.get<UserProfile>('/profile');
    return response.data;
  },

  // Update profile
  updateProfile: async (data: UpdateProfileRequest): Promise<UserProfile> => {
    const response = await api.patch<UserProfile>('/profile', data);
    return response.data;
  },

  // Upload profile picture
  uploadProfilePicture: async (file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<{ url: string }>('/profile/picture', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  // Delete profile picture
  deleteProfilePicture: async (): Promise<void> => {
    await api.delete('/profile/picture');
  },

  // Upload resume
  uploadResume: async (file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<{ url: string }>('/profile/resume', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  // Delete resume
  deleteResume: async (): Promise<void> => {
    await api.delete('/profile/resume');
  },

  // Get profile completeness
  getCompleteness: async (): Promise<ProfileCompleteness> => {
    const response = await api.get<ProfileCompleteness>('/profile/completeness');
    return response.data;
  },

  // Import profile from LinkedIn
  importFromLinkedIn: async (linkedinUrl: string): Promise<Partial<UpdateProfileRequest>> => {
    const response = await api.post<Partial<UpdateProfileRequest>>('/profile/import/linkedin', {
      url: linkedinUrl,
    });
    return response.data;
  },

  // Parse resume and extract information
  parseResume: async (file: File): Promise<Partial<UpdateProfileRequest>> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<Partial<UpdateProfileRequest>>('/profile/parse-resume', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  // Get skill suggestions based on job category
  getSkillSuggestions: async (category: string): Promise<string[]> => {
    const response = await api.get<string[]>(`/profile/skills/suggestions?category=${encodeURIComponent(category)}`);
    return response.data;
  },

  // Validate profile data
  validateProfile: async (data: UpdateProfileRequest): Promise<{
    valid: boolean;
    errors: Record<string, string>;
    warnings: Record<string, string>;
  }> => {
    const response = await api.post('/profile/validate', data);
    return response.data;
  },

  // Get profile visibility settings
  getVisibilitySettings: async (): Promise<{
    publicProfile: boolean;
    showEmail: boolean;
    showPhone: boolean;
    showResume: boolean;
  }> => {
    const response = await api.get('/profile/visibility');
    return response.data;
  },

  // Update profile visibility settings
  updateVisibilitySettings: async (settings: {
    publicProfile?: boolean;
    showEmail?: boolean;
    showPhone?: boolean;
    showResume?: boolean;
  }): Promise<void> => {
    await api.patch('/profile/visibility', settings);
  },

  // Export profile data
  exportProfileData: async (format: 'json' | 'pdf'): Promise<Blob> => {
    const response = await api.get(`/profile/export?format=${format}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Delete profile (soft delete)
  deleteProfile: async (): Promise<void> => {
    await api.delete('/profile');
  },

  // Get public profile by username or ID
  getPublicProfile: async (identifier: string): Promise<{
    user: Partial<User>;
    profile: Partial<UserProfile>;
  }> => {
    const response = await api.get(`/profile/public/${identifier}`);
    return response.data;
  },
};