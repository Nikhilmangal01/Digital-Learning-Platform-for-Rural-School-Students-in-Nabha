// User Model - Multi-Tenant Scoped User
// Digital Learning Platform - Nabha | Developed by Piyush and Team

class User {
  constructor(data = {}) {
    this.id = data.id || Date.now();
    this.username = (data.username || '').trim().toLowerCase();
    this.name = (data.name || '').trim();
    this.role = data.role || 'student'; // 'student' | 'teacher' | 'admin'
    this.class = Number(data.class) || 0;
    this.subject = data.subject || (data.role === 'teacher' ? 'Maths' : '');
    this.schoolId = data.schoolId || 'SCH_NABHA_01'; // School association for student
    this.schoolName = data.schoolName || 'Govt Sen Sec School, Nabha';
    this.curriculumCode = (data.curriculumCode || 'PSEB').trim().toUpperCase(); // Curriculum followed
    this.hash = data.hash || '';
    this.approved = typeof data.approved === 'boolean' ? data.approved : true;
    this.createdAt = data.createdAt || new Date().toISOString();
  }

  static sanitize(u) {
    if (!u) return null;
    return {
      id: u.id,
      username: u.username,
      name: u.name,
      role: u.role,
      class: u.class,
      subject: u.subject || (u.role === 'teacher' ? 'Maths' : ''),
      schoolId: u.schoolId || 'SCH_NABHA_01',
      schoolName: u.schoolName || 'Govt Sen Sec School, Nabha',
      curriculumCode: u.curriculumCode || 'PSEB',
      approved: u.approved,
    };
  }
}

module.exports = User;
