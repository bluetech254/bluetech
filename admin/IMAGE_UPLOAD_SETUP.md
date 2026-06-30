# Image Upload Setup Guide

The admin panel supports automatic image uploading to cloud storage services. This is optional but recommended for production use.

## Option 1: ImgBB (Recommended - Free & Easy)

ImgBB is a free image hosting service with a generous API.

### Setup Steps:

1. Visit: https://api.imgbb.com/
2. Sign up for a free account
3. Get your API key from the dashboard
4. Add to `.env` file:
   ```
   VITE_IMGBB_API_KEY=your_api_key_here
   ```

**Features:**
- ✅ Free tier: Unlimited uploads
- ✅ No credit card required
- ✅ Fast CDN delivery
- ✅ Auto image optimization

## Option 2: Cloudinary (Alternative)

Cloudinary offers more advanced features but requires account setup.

### Setup Steps:

1. Visit: https://cloudinary.com/
2. Sign up for a free account
3. Get your credentials from the dashboard
4. Add to `.env` file:
   ```
   VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
   VITE_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
   ```

**Features:**
- ✅ Free tier: 25GB storage, 25GB bandwidth/month
- ✅ Advanced image transformations
- ✅ Auto-format and optimization
- ✅ Global CDN

### Creating an Upload Preset:

1. Go to Settings > Upload
2. Click "Add upload preset"
3. Set signing mode to "Unsigned"
4. Configure folder structure
5. Copy the preset name

## Fallback: Manual URL Entry

If no API keys are configured, users can still:
- Enter image URLs manually
- Use existing hosted images
- Upload to their own servers

## Testing Without Setup

The component will work without any API keys by:
1. Showing image preview for local files
2. Allowing manual URL entry
3. Using demo Cloudinary account (limited)

## Restart After Configuration

After adding API keys to `.env`:
```bash
# Stop the admin panel
pkill -f "vite.*3000"

# Restart
cd admin
npm run dev
```

## Security Notes

- Never commit `.env` file to version control
- Use environment variables in production
- Restrict API keys to your domain
- Monitor usage to avoid abuse
- Consider adding file size limits (already set to 5MB)

## Supported Formats

- PNG
- JPG/JPEG
- WebP
- GIF (static)

Maximum file size: **5MB**
