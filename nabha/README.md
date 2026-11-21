# Digital Learning Platform for Rural School Students in Nabha
PS: PIET/CS/FYP/PS019

## Run
1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure MongoDB Atlas in `.env`:
   ```env
   MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/nabha?retryWrites=true&w=majority
   DB_NAME=nabha
   PORT=5000
   ```
3. Start the application:
   ```bash
   npm start
   ```
4. Open your browser at:
   `http://localhost:5000`

## Database Architecture (`db/`)
All database operations and models are organized inside the `db/` folder:
- `db/connection.js`: MongoDB Atlas connection pool and lifecycle management.
- `db/operations.js`: Database queries for all pages (Users, Lessons, Quizzes, Progress, Announcements).
- `db/seed.js`: Auto-migrates existing data from `data.json` into MongoDB Atlas collections and creates unique indexes.
- `db/index.js`: Main DB interface imported by `server.js`.

## Demo accounts (shown on login page; hide with DEMO_MODE=false)
- Admin: `admin` / `admin123`
- Teachers: `teacher_manpreet` / `teacher123`, `teacher_gurdeep` / `teacher123`
- Students: `simran_k` / `student123`, `new_student` / `student123`

Set `DEMO_MODE=false` in `.env` to hide demo details.

Developed by Piyush and Team
