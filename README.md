# CareEase

![CareEase Logo](./assets/logo.png)  
*Your Friendly Private Health Center Appointment System*

---

### 🎯 Project Description

CareEase is a Node.js/Express.js/MongoDB application using EJS templates and session-based authentication. It allows patients to register, log in, and book appointments easily. Doctors and employees manage availability, patient appointments, and add prescriptions and comments for each visit.

This project is designed to run locally using VS Code and MongoDB. It provides full CRUD functionality with role-based access control and a clean, responsive UI.

---

### 🚀 Features

- Secure registration and session-based login/logout
- Role-based dashboards for patients, doctors, and employees
- CRUD operations for appointments (book, edit, cancel)
- Doctors can add prescriptions and comments linked to patient history
- Patient view for reviewing past visits and prescriptions
- Responsive design with accessible colors and form validation
- CSS Flexbox & Grid layout for easy navigation

---

### 📋 How to Use

1. Register as a patient, doctor, or employee
2. Login with your credentials
3. Patients can view and manage their appointments
4. Doctors and employees manage their schedules and patient data
5. Doctors add prescriptions and comments during appointments
6. Patients can view their medical history in their dashboard

---

### 🛠 Technologies Used

- Node.js & Express.js
- MongoDB with Mongoose ODM
- EJS templating engine
- express-session for authentication
- CSS Flexbox and Grid for layout
- Git & GitHub for version control

---

### 📜 Attributions

- Icons: [Font Awesome](https://fontawesome.com)
- CSS inspiration: [Bootstrap](https://getbootstrap.com)
- Other educational resources credited inside project files

---

### 🌐 Deployment & Installation

This application is intended for **local deployment** in development environments.

To get started:

git clone https://github.com/SayedAliMajed/care-ease.git
cd careease
npm install

Create a .env file with your MongoDB URI and session secret
npm start

Open your browser and visit `http://localhost:3000`

---

### 🎨 Design Features

- Consistent color palette reflecting health and wellness
- Accessible UI with alt text and focus handling
- Button styles and form validation throughout the site

---

### 📁 Project Structure

- `/models` – Mongoose schemas
- `/controllers` – Application logic
- `/views` – EJS templates
- `/public` – Static files (CSS, JS, images)
- `/middleware` – Authentication & validation layers

---

### 🌱 Next Steps

- Implement email notifications for appointments
- Add calendar synchronization features
- Expand patient history detail views
- Optimize for mobile-first experience

---

Thank you for exploring CareEase!

---

