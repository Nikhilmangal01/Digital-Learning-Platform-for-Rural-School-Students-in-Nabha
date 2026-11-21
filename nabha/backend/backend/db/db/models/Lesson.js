// Lesson Model - Curriculum-Scoped Lesson
// Digital Learning Platform - Nabha | Developed by Piyush and Team

class Lesson {
  constructor(data = {}) {
    this.id = Number(data.id) || Date.now();
    this.c = Number(data.c) || 8; // class
    this.s = (data.s || 'Science').trim(); // subject
    this.t = data.t || { en: '', hi: '', pa: '' }; // title
    this.cnt = data.cnt || { en: '', hi: '', pa: '' }; // content
    this.authorId = data.authorId != null ? Number(data.authorId) : null;
    this.authorName = data.authorName || '';
    this.curriculumCode = (data.curriculumCode || 'PSEB').trim().toUpperCase(); // Curriculum board
    this.schoolId = data.schoolId || 'ALL'; // 'ALL' = Shared for whole curriculum, or school-specific
    this.mediaUrl = data.mediaUrl || '';
    this.createdAt = data.createdAt || new Date().toISOString();
  }
}

module.exports = Lesson;
