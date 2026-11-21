// Lesson Model - Curriculum-Scoped Lesson
// Digital Learning Platform - Nabha | Developed by Piyush and Team

class Lesson {
  constructor(data = {}) {
    this.id = Number(data.id) || Date.now();
    this.c = Number(data.c) || 8; // class
    this.s = (data.s || 'Science').trim(); // subject
    this.t = data.t || { en: '', hi: '', pa: '' }; // title
    
    // Normalize content across all representations (cnt, content, n)
    const contentObj = data.content || data.cnt || data.n || { en: '', hi: '', pa: '' };
    this.cnt = contentObj;
    this.content = contentObj;
    this.n = contentObj;

    this.authorId = data.authorId != null ? Number(data.authorId) : null;
    this.authorName = data.authorName || '';
    this.curriculumCode = (data.curriculumCode || 'PSEB').trim().toUpperCase(); // Curriculum board
    this.schoolId = data.schoolId || 'ALL'; // 'ALL' = Shared for whole curriculum, or school-specific
    this.mediaUrl = data.mediaUrl || '';
    this.driveLink = (data.driveLink || '').trim();
    this.attachments = Array.isArray(data.attachments) ? data.attachments : [];
    this.createdAt = data.createdAt || new Date().toISOString();
  }
}

module.exports = Lesson;
