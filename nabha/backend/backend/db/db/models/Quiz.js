// Quiz Model - Curriculum-Scoped Interactive Assessment
// Digital Learning Platform - Nabha | Developed by Piyush and Team

class Quiz {
  constructor(data = {}) {
    this.id = Number(data.id) || Date.now();
    this.lesson = Number(data.lesson) || 0;
    this.curriculumCode = (data.curriculumCode || 'PSEB').trim().toUpperCase();
    this.schoolId = data.schoolId || 'ALL';
    this.q = Array.isArray(data.q) ? data.q : []; // list of questions: { q: { en, hi, pa }, o: [...], a: 0 }
    this.createdAt = data.createdAt || new Date().toISOString();
  }
}

module.exports = Quiz;
