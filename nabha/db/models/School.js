// School Model - Multi-Tenant School Management
// Digital Learning Platform - Nabha | Developed by Piyush and Team

class School {
  constructor(data = {}) {
    this.schoolId = (data.schoolId || '').trim(); // e.g. 'SCH_NABHA_01'
    this.name = (data.name || '').trim(); // e.g. 'Govt Sen Sec School, Nabha'
    this.curriculumCode = (data.curriculumCode || 'PSEB').trim().toUpperCase(); // Foreign key to Curriculum
    this.city = (data.city || 'Nabha').trim();
    this.state = (data.state || 'Punjab').trim();
    this.active = data.active !== false;
    this.createdAt = data.createdAt || new Date().toISOString();
  }

  static validate(s) {
    if (!s.schoolId) return 'School ID is required (e.g. SCH_NABHA_01)';
    if (!s.name) return 'School name is required';
    if (!s.curriculumCode) return 'Assigned curriculum is required (e.g. PSEB)';
    return null;
  }
}

module.exports = School;
