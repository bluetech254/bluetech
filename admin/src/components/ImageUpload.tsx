import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader } from 'lucide-react';

interface ImageUploadProps {
  currentImageUrl?: string;
  onImageUploaded: (url: string) => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

// Cloudinary config (free tier)
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'demo';
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'ml_default';

export default function ImageUpload({ currentImageUrl, onImageUploaded, onShowToast }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string>(currentImageUrl || '');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadImage(file);
    }
  };

  // Handle drag and drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await uploadImage(file);
    }
  };

  // Upload to Cloudinary or ImgBB
  const uploadImage = async (file: File) => {
    // Validate file
    if (!file.type.startsWith('image/')) {
      onShowToast('Please select an image file', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      onShowToast('Image size must be less than 5MB', 'error');
      return;
    }

    setUploading(true);
    
    try {
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);

      // Try ImgBB first (free, no account needed)
      const imgBBKey = import.meta.env.VITE_IMGBB_API_KEY;
      
      if (imgBBKey) {
        const formData = new FormData();
        formData.append('image', file);
        
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${imgBBKey}`, {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();
        
        if (data.success) {
          const imageUrl = data.data.url;
          setPreview(imageUrl);
          onImageUploaded(imageUrl);
          onShowToast('Image uploaded successfully!', 'success');
          return;
        }
      }

      // Fallback to Cloudinary
      const cloudinaryFormData = new FormData();
      cloudinaryFormData.append('file', file);
      cloudinaryFormData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

      const cloudinaryResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: cloudinaryFormData,
        }
      );

      const cloudinaryData = await cloudinaryResponse.json();
      
      if (cloudinaryData.secure_url) {
        const imageUrl = cloudinaryData.secure_url;
        setPreview(imageUrl);
        onImageUploaded(imageUrl);
        onShowToast('Image uploaded successfully!', 'success');
      } else {
        throw new Error('Upload failed');
      }
      
    } catch (error) {
      console.error('Upload error:', error);
      onShowToast('Failed to upload image. Try entering URL manually.', 'error');
    } finally {
      setUploading(false);
    }
  };

  // Clear image
  const handleClear = () => {
    setPreview('');
    onImageUploaded('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-3">
      
      {/* Upload Area */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all ${
          dragActive
            ? 'border-blue-500 bg-blue-50'
            : preview
            ? 'border-green-300 bg-green-50'
            : 'border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          disabled={uploading}
        />

        {uploading ? (
          <div className="flex flex-col items-center justify-center py-4">
            <Loader className="h-8 w-8 text-blue-600 animate-spin mb-2" />
            <p className="text-sm text-slate-600 font-semibold">Uploading...</p>
          </div>
        ) : preview ? (
          <div className="relative">
            <img
              src={preview}
              alt="Preview"
              className="max-h-48 mx-auto rounded-lg object-cover"
            />
            <button
              onClick={handleClear}
              className="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-lg transition-colors"
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-4">
            <Upload className="h-10 w-10 text-slate-400 mb-3" />
            <p className="text-sm font-semibold text-slate-700 mb-1">
              Drop image here or click to upload
            </p>
            <p className="text-xs text-slate-500">
              PNG, JPG, WebP up to 5MB
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              type="button"
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              <ImageIcon className="h-4 w-4 inline mr-2" />
              Select Image
            </button>
          </div>
        )}
      </div>

      {/* Alternative: Manual URL Input */}
      {!preview && (
        <div className="text-center">
          <p className="text-xs text-slate-500">or use existing image URL</p>
        </div>
      )}
    </div>
  );
}
