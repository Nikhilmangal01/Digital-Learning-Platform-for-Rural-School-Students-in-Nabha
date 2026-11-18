# 🎓 Digital Learning Platform for Rural School Students in Nabha

> A low-bandwidth, offline-friendly, multilingual learning platform that brings lessons, quizzes and progress tracking to rural school students in Nabha, Punjab.

![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-Offline%20Ready-5A0FC8)
![Languages](https://img.shields.io/badge/Languages-EN%20%7C%20HI%20%7C%20PA-1f7a5c)

**Final Year Project, Department of Computer Science**
Problem Statement No.: `PIET/CS/FYP/PS019` | Team Number: `27`

---

## 📌 Problem Statement

Students in rural and semi-rural regions such as Nabha, Punjab face limited educational infrastructure, a shortage of trained teachers, poor internet connectivity, low digital literacy, and a lack of localized, curriculum-aligned learning material. This widens the gap between rural and urban education.

This project provides an accessible, easy-to-use digital learning platform that works on weak internet connections, supports local languages, and is simple enough for first-time digital learners.

## ✨ Features

### 🎒 Student
- Register and log in with name, class, school and village
- Dashboard with overall progress ring, badges and announcements
- Browse lessons by subject and class (Maths, Science, English, Punjabi)
- Read lesson notes and mark lessons as complete
- Take MCQ quizzes with instant right/wrong feedback and scores
- **Progress starts at 0%** for every new student and is calculated only from real completed lessons and quizzes

### 👩‍🏫 Teacher
- Teacher registration with **admin approval** before access
- Add new lessons with titles in English, Hindi and Punjabi
- View all students with their individual progress bars and the class average
- Post announcements that appear on every student's dashboard

### 🛠️ Admin
- Separate admin login (admin accounts cannot self-register)
- Dashboard with counts of students, teachers, pending approvals, lessons and quizzes
- Approve teacher registrations
- Reset any user's password

### 🌐 Platform-wide
- **Three languages:** English, Hindi and Punjabi (Gurmukhi). The whole interface, including lesson and quiz content, changes instantly, and the choice is remembered
- **Offline support:** service worker caches the app; lessons, quizzes and progress are saved on the device. Quiz results and completed lessons made offline are queued and synced when the internet returns (**Sync now** button)
- **Low-bandwidth friendly:** a single lightweight page with no heavy frameworks
- **Role-based access control:** student, teacher and admin each get their own dashboard, protected on both frontend and backend
- Light/Dark mode, responsive mobile-first design, large touch-friendly buttons
- Online/Offline status indicator

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, vanilla JavaScript (single-page app) |
| Backend | Node.js, Express.js |
| Storage | JSON file database (`data.json`, auto-created) |
| Authentication | Signed tokens (HMAC-SHA256), password hashing with `scrypt` |
| Offline | Service Worker + browser `localStorage` with a sync queue |
| i18n | Built-in English / Hindi / Punjabi dictionaries |
| Tools | Git, GitHub, Postman |

## 📁 Project Structure

```
nabha/
├── server.js          # Express server: auth, content, progress, sync, admin APIs
├── package.json
├── README.md
└── public/
    ├── index.html     # Complete frontend (UI, translations, dashboards)
    └── sw.js          # Service worker for offline support
```

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org) 18 or newer

### Run locally

```bash
# 1. Clone the repository
git clone https://github.com/<your-username>/<your-repo-name>.git
cd <your-repo-name>

# 2. Install dependencies
npm install

# 3. Start the app
npm start
```

Open **http://localhost:5000** in your browser.

> The first run creates `data.json` with sample schools, lessons and quizzes. To reset all data, stop the server, delete `data.json` and start again.

### Optional environment variables

| Variable | Purpose | Default |
|---|---|---|
| `PORT` | Port the server listens on | `5000` |
| `SECRET` | Secret used to sign login tokens (**set your own in production**) | built-in dev value |

Example (Windows CMD): `set PORT=5001 && npm start`

## 🔑 Demo Accounts

These accounts are created automatically for demonstration. Choose the matching role (Student / Teacher / Admin) on the login page first.

| Role | Username | Password |
|---|---|---|
| Admin | `admin` | `admin123` |
| Teacher | `teacher_manpreet` | `teacher123` |
| Teacher | `teacher_gurdeep` | `teacher123` |
| Student (has sample progress) | `simran_k` | `student123` |
| Student (starts at 0%) | `new_student` | `student123` |

> ⚠️ These are demo credentials only. Change them before any real deployment.

## 🔌 API Overview

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/register` | Public | Register a student or teacher |
| POST | `/api/login` | Public | Login with role check |
| GET | `/api/content` | Logged in | Lessons and quizzes |
| GET | `/api/progress` | Student | Student's saved progress |
| POST | `/api/sync` | Student | Sync offline lessons and quiz scores |
| GET | `/api/teacher/students` | Teacher, Admin | Students with progress % |
| POST | `/api/teacher/lesson` | Teacher, Admin | Add a lesson |
| POST | `/api/announce` | Teacher, Admin | Post an announcement |
| GET | `/api/announcements` | Logged in | Latest announcements |
| GET | `/api/admin/users` | Admin | All users |
| POST | `/api/admin/approve` | Admin | Approve a teacher |
| POST | `/api/admin/reset` | Admin | Reset a user's password |

## 🔄 How Offline Mode Works

1. The **service worker** caches the app so it opens without internet.
2. After the first online visit, lessons and quizzes are stored on the device.
3. Completing a lesson or taking a quiz offline updates progress locally and adds the action to a **sync queue**.
4. When the connection returns (or the student taps **Sync now**), the queue is sent to `/api/sync` and the server updates the student's progress.

## 🗺️ Objectives Covered

| Objective | Implementation |
|---|---|
| User-friendly platform | Simple dashboards, large buttons, icons, mobile-first layout |
| Offline access to lessons and quizzes | Service worker, device storage, sync queue |
| Teacher dashboard | Student progress view, lesson upload, announcements |
| Progress tracking and assessment | Progress ring, quiz scoring, badges, 0% start |
| Multilingual support | English, Hindi, Punjabi across the whole app |
| Low-bandwidth optimisation | Lightweight single-page app, local caching |

## 🔮 Future Scope

- Migrate storage to **MongoDB** for large-scale use
- Video lessons with selectable quality (144p / 240p / 360p)
- Teacher quiz builder and CSV bulk upload
- Charts and analytics dashboards
- Automated tests (Jest, Supertest)
- Cloud deployment and pilot rollout in Nabha schools

## 👥 Team

| S. No. | Name | Roll No. / Enrollment No. |
|---|---|---|
| 1 | Piyush Khandelwal | PIET23CS122 |
| 2 | Nikhil Mangal | PIET23CS114 |
| 3 | Keshav Kumar | PIET23CS086 |

**Project Guide:** Ar. Vivek Saxena
**Department of Computer Science**, Team No. 27

---

<p align="center"><b>Developed by Piyush and Team</b></p>
