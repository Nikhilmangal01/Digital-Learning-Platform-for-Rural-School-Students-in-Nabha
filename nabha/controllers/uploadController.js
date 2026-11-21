// Upload & Attachment Controller
// Digital Learning Platform - Nabha | Developed by Piyush and Team
const fs = require('fs');
const path = require('path');
const db = require('../db');

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

exports.uploadFile = async (req, res) => {
  try {
    const { filename, data, type, title } = req.body;
    if (!filename || !data) {
      return res.status(400).json({ error: 'missing_file_data' });
    }

    // Sanitize filename & extension
    const cleanExt = path.extname(filename).toLowerCase();
    const allowedExts = ['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.doc', '.docx'];
    if (!allowedExts.includes(cleanExt)) {
      return res.status(400).json({ error: 'invalid_file_type', message: 'Only PDF, Image (.png, .jpg, .webp) files are allowed.' });
    }

    const isPdf = cleanExt === '.pdf';
    const isImage = ['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(cleanExt);
    const resolvedType = isPdf ? 'pdf' : (isImage ? 'image' : 'file');

    // Remove Base64 prefix like 'data:application/pdf;base64,' if present
    const base64Data = data.includes(';base64,') ? data.split(';base64,').pop() : data;
    const buffer = Buffer.from(base64Data, 'base64');

    // Max 25MB check
    if (buffer.length > 25 * 1024 * 1024) {
      return res.status(400).json({ error: 'file_too_large', message: 'File size must be under 25MB.' });
    }

    const safeBaseName = path.basename(filename, cleanExt).replace(/[^a-zA-Z0-9_\-]/g, '_');
    const uniqueFileName = `${Date.now()}_${safeBaseName}${cleanExt}`;
    const targetFilePath = path.join(uploadsDir, uniqueFileName);

    fs.writeFileSync(targetFilePath, buffer);

    const attachment = {
      id: 'att_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      type: resolvedType,
      filename: filename,
      url: `/uploads/${uniqueFileName}`,
      size: buffer.length,
      sizeFormatted: formatBytes(buffer.length),
      title: title && title.trim() ? title.trim() : filename,
      uploadedBy: (req.u && req.u.name) || 'Teacher',
      uploadedById: req.u && req.u.id,
      uploadedAt: new Date().toISOString()
    };

    res.json({ ok: true, attachment });
  } catch (err) {
    console.error('uploadFile error:', err);
    res.status(500).json({ error: 'upload_failed' });
  }
};

exports.addAttachment = async (req, res) => {
  try {
    const { lessonId, attachment, driveLink, title } = req.body;
    if (!lessonId) return res.status(400).json({ error: 'lesson_id_required' });

    const lessons = await db.getLessons();
    const lesson = lessons.find(l => l.id == Number(lessonId));
    if (!lesson) return res.status(404).json({ error: 'lesson_not_found' });

    if (req.u.role !== 'admin' && lesson.authorId != null && lesson.authorId !== req.u.id) {
      return res.status(403).json({ error: 'unauthorized' });
    }

    lesson.attachments = Array.isArray(lesson.attachments) ? lesson.attachments : [];

    let newAtt = null;
    if (driveLink) {
      newAtt = {
        id: 'att_link_' + Date.now(),
        type: 'link',
        driveLink: String(driveLink).trim(),
        url: String(driveLink).trim(),
        filename: 'Google Drive Resource',
        title: title && title.trim() ? title.trim() : 'Google Drive Notes',
        uploadedBy: (req.u && req.u.name) || 'Teacher',
        uploadedById: req.u && req.u.id,
        uploadedAt: new Date().toISOString()
      };
      lesson.attachments.push(newAtt);
      lesson.driveLink = newAtt.driveLink;
    } else if (attachment && attachment.url) {
      newAtt = attachment;
      if (!newAtt.id) newAtt.id = 'att_' + Date.now();
      lesson.attachments.push(newAtt);
    } else {
      return res.status(400).json({ error: 'invalid_attachment_payload' });
    }

    await db.updateLesson(lesson.id, { attachments: lesson.attachments, driveLink: lesson.driveLink || '' }, req.u.id, req.u.role);

    res.json({ ok: true, attachment: newAtt, attachments: lesson.attachments });
  } catch (err) {
    console.error('addAttachment error:', err);
    res.status(500).json({ error: 'server_error' });
  }
};

exports.deleteAttachment = async (req, res) => {
  try {
    const params = req.params || {};
    const body = req.body || {};
    const lessonId = params.lessonId || body.lessonId;
    const attachmentId = params.attachmentId || body.attachmentId;

    if (!lessonId || !attachmentId) {
      return res.status(400).json({ error: 'missing_parameters' });
    }

    const lessons = await db.getLessons();
    const lesson = lessons.find(l => l.id == Number(lessonId));
    if (!lesson) return res.status(404).json({ error: 'lesson_not_found' });

    // Permissions: Admin can delete any; Teacher can only delete from their own lessons
    if (req.u.role !== 'admin' && lesson.authorId != null && lesson.authorId !== req.u.id) {
      return res.status(403).json({ error: 'unauthorized' });
    }

    const currentAttachments = Array.isArray(lesson.attachments) ? lesson.attachments : [];
    const targetAtt = currentAttachments.find(a => a.id === attachmentId || a.url === attachmentId);

    if (targetAtt && targetAtt.url && targetAtt.url.startsWith('/uploads/')) {
      const fileName = path.basename(targetAtt.url);
      const filePath = path.join(uploadsDir, fileName);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          console.warn('Could not delete physical file:', e.message);
        }
      }
    }

    const updatedAttachments = currentAttachments.filter(a => a.id !== attachmentId && a.url !== attachmentId);

    // If driveLink was removed
    let updatedDriveLink = lesson.driveLink;
    if (targetAtt && (targetAtt.type === 'link' || targetAtt.driveLink === lesson.driveLink)) {
      const remainingLink = updatedAttachments.find(a => a.type === 'link');
      updatedDriveLink = remainingLink ? remainingLink.driveLink : '';
    }

    await db.updateLesson(lesson.id, { attachments: updatedAttachments, driveLink: updatedDriveLink }, req.u.id, req.u.role);

    res.json({ ok: true, attachments: updatedAttachments });
  } catch (err) {
    console.error('deleteAttachment error:', err);
    res.status(500).json({ error: 'server_error' });
  }
};
