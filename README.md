# Cihoshe Lounge Web Application

A responsive university web-development project for **Cihoshe Lounge — Luxury African Dining**.

## Technologies
- HTML5
- CSS3
- JavaScript (ES6+)
- MySQL
- Node.js + Express (JavaScript runtime/API layer)
- mysql2

**Bootstrap is not used.** The responsive layout is implemented with custom CSS3 media queries and CSS Grid/Flexbox.

## Features
- Responsive home page for desktop, tablet and mobile
- Digital African delicacies menu with category filters
- Online reservation form
- Customer feedback form
- Contact section
- Manager dashboard with reservation and summary data
- MySQL persistence when database credentials are configured
- Demo mode when MySQL is unavailable, so the interface can still be demonstrated

## Important architecture note
A browser cannot safely connect directly to MySQL. Therefore, JavaScript is used on both sides: browser JavaScript calls the Node.js/Express API, and the API connects to MySQL using mysql2. No PHP is used anywhere.

## Run locally
1. Install Node.js LTS and MySQL.
2. Open a terminal in this project folder.
3. Run `npm install`.
4. Copy `.env.example` to `.env` and enter your MySQL password.
5. Create the database by running `sql/schema.sql` in MySQL Workbench or the MySQL command line.
6. Run `npm start`.
7. Open `http://localhost:3000`.

If MySQL is not configured, the website starts in demo mode. Reservation and feedback submissions are stored temporarily in server memory.

## Suggested university demonstration
Show the lecturer:
1. Responsive Home page.
2. Menu filtering.
3. Reservation submission.
4. Feedback submission.
5. Manager dashboard.
6. MySQL tables in MySQL Workbench.
7. Explain that Node.js is only the JavaScript server/API layer because HTML/CSS/browser JavaScript cannot directly and securely connect to MySQL.
