import { Router } from 'express';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

const router = Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Allowed MIME types and their extensions
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
};

/**
 * Upload a file via base64
 */
router.post('/', (req, res) => {
  try {
    const { data, mimetype, filename: originalFilename } = req.body;

    if (!data || !mimetype) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Missing required fields: data, mimetype',
      });
    }

    // Validate mimetype
    const ext = MIME_TO_EXT[mimetype];
    if (!ext) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Invalid file type. Only images (JPEG, PNG, GIF, WebP) and videos (MP4, WebM, MOV) are allowed.',
      });
    }

    // Generate unique filename
    const filename = `${uuidv4()}${ext}`;
    const filepath = path.join(uploadsDir, filename);

    // Decode base64 and save file
    const base64Data = data.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Check file size (50MB max)
    if (buffer.length > 50 * 1024 * 1024) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'File too large. Maximum size is 50MB.',
      });
    }

    fs.writeFileSync(filepath, buffer);

    const fileUrl = `/uploads/${filename}`;
    const isVideo = mimetype.startsWith('video/');

    res.json({
      success: true,
      url: fileUrl,
      filename,
      mimetype,
      size: buffer.length,
      isVideo,
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({
      error: 'UploadError',
      message: error.message,
    });
  }
});

export default router;
