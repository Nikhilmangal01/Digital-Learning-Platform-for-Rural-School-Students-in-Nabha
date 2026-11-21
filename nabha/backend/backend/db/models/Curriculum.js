// Curriculum Model - Multi-Curriculum Management
// Digital Learning Platform - Nabha | Developed by Piyush and Team

class Curriculum {
  constructor(data = {}) {
    this.code = (data.code || '').trim().toUpperCase(); // e.g. 'PSEB', 'CBSE', 'ICSE'
    this.name = (data.name || '').trim(); // e.g. 'Punjab School Education Board'
    this.description = data.description || '';
    this.classes = Array.isArray(data.classes) ? data.classes : [6, 7, 8, 9, 10, 11, 12];
    this.subjects = Array.isArray(data.subjects) ? data.subjects : ['Maths', 'Science', 'English', 'Punjabi'];
    this.createdAt = data.createdAt || new Date().toISOString();
  }

  static validate(c) {
    if (!c.code || typeof c.code !== 'string') return 'Curriculum code is required (e.g. PSEB)';
    if (!c.name || typeof c.name !== 'string') return 'Curriculum name is required';
    return null;
  }
}

module.exports = Curriculum;
