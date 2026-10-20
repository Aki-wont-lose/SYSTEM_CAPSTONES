# APPENDIX B. USER'S GUIDE

## SIMES: A Web-Based Student Internship Monitoring and Evaluation System for STI College Sta. Maria

**Student Internship Monitoring and Evaluation System**

This guide shows how to use SIMES, the internship monitoring system of STI College Sta. Maria. Each screen is shown as it appears in the system. The red numbered markers on a figure match the numbered items written below it, which explain what each part of the screen does.

The system has three end-user roles. A **Coordinator** manages the internship records of the students in a single assigned program. A **Supervisor** oversees the interns deployed to their partner company. A **Student** logs internship hours, submits requirements, finds a company and communicates with staff. Each part of this guide states which roles can use it.

> **Signing in.** Coordinators, Supervisors and Students all sign in with their **Microsoft (Office 365) school account**. The password-based **Admin Log in** button is for the system administrator only and is not covered in this guide.

---

## Signing In

Every person who uses SIMES has an account created by the administrator. There is no self-registration. Coordinators and Supervisors use a school staff email in the form `firstname.lastname@stamaria.sti.edu.ph`; Students use their STI student email.

On the STI College Sta. Maria landing page, click the **Log in** button at the top-right. A **Log in** dialog opens with two choices: **Log in with Office 365** and **Admin Log in**. Coordinators, Supervisors and Students choose **Log in with Office 365**.

### Microsoft Sign-In

1. **School email:** Type your full school email address, then click **Next**.
2. **Password:** Type your Microsoft password, then click **Sign in**.
3. **Multi-Factor Authentication:** If prompted, approve the request in the Microsoft Authenticator app or enter the code sent to your device.
4. **Stay signed in?** Choose **Yes** to reduce future prompts, or **No** on a shared computer.

After a successful sign-in you are taken straight to the home page for your role: the **Coordinator Dashboard**, the **Supervisor Dashboard**, or the **Student Dashboard**.

> **If your account was created with a temporary password,** the system automatically opens the **Change Password** page on your first sign-in. Type your new password twice and click **Save** before continuing.

### Trouble Signing In

- **Wrong email or personal account.** Make sure you typed your full school email and that the browser is not already signed into a personal Microsoft account.
- **Login failed (AADSTS50011).** The sign-in address does not match the one registered for the school. Use **https://system-capstones.vercel.app**.
- **"Not authorized" or a blank page after login.** Your account may be disabled or not yet activated. Contact the administrator.

---

## Getting Around the System

Every page uses the same layout, so once you know the parts of one page you can find your way around all of them.

1. **SIMES logo:** Click it to return to your dashboard.
2. **Sidebar menu:** The main modules of the system, grouped into sections — Main, Management, Academic and System. The list only shows what your role is allowed to use, so a Supervisor and a Student see fewer items than a Coordinator.
3. **Collapse button:** Hides the sidebar to give the page more room. The menu button at the top-left brings it back. On a phone, the sidebar opens over the page.
4. **Page header:** Shows the title of the current page and a one-line description of what you can do there.
5. **Theme toggle:** Switches between light and dark mode. Your choice is remembered.
6. **User area:** Shows who is signed in and opens the account menu described next.

### User Menu

1. **Your name and role:** Click to open or close the menu.
2. **Profile:** Opens the page where you can review your details and change your photo.
3. **Messages:** Opens the in-system chat with a badge when there are unread replies.
4. **Logout:** Signs you out. Always log out when using a shared computer.

---

## Dashboard

The dashboard is the first page after signing in. It gives a quick summary of your internship activity and shortcuts to the most common tasks. The Coordinator and Supervisor share the **Staff Dashboard**; the Student sees a **Student Dashboard**.

### Staff Dashboard
*Available to: Coordinator and Supervisor.*

1. **Summary cards:** Quick counts such as the number of students under your care, DTRs waiting for approval, submissions received and hours rendered.
2. **Recent activity:** The latest events in your scope, such as newly submitted DTRs and requirements.
3. **Quick shortcuts:** Buttons that jump to the pages you use most, such as Attendance and Submissions.
4. **Announcements:** Notices posted by the coordinator or the school.

### Student Dashboard
*Available to: Student.*

1. **Internship details:** Your assigned company and supervisor, and your internship period.
2. **Hours progress:** Total hours completed against the hours required for the subject.
3. **Pending DTR approvals:** How many of your daily records are still waiting for a decision.
4. **Requirements still due:** The submissions you have not completed yet.
5. **Announcements:** The latest notices from your coordinator and supervisor.

---

## Attendance and DTR Monitoring

### DTR Review Queue
*Available to: Coordinator and Supervisor.*

The **Attendance** page is where staff review the Daily Time Records submitted by students. Each record carries a camera-verified photo taken at time-in, so it can be checked against the actual person.

1. **Status tabs:** Choose **Awaiting** for records waiting for a decision, **Approved** for records you have accepted, or **Rejected** for records you returned to the student.
2. **Count badge:** Shows how many records are in the selected tab.
3. **Program filter:** A Coordinator is assigned to one program, so the page shows a **"my program students only"** indicator instead of a selector. A Supervisor, who may handle students from several programs, sees an **All programs** dropdown.
4. **Student row:** Shows the student's name with an avatar, their program and section, and chips summarising how many records are pending, approved or rejected.
5. **Record row:** Shows the date, time in, time out and rendered hours of one day.
6. **Photo preview:** Click the photo thumbnail to enlarge the verification image.
7. **Approve:** Accepts the record and moves it to the **Approved** tab.
8. **Reject:** Opens a **Remarks** field. Type the reason, then click **Confirm rejection**. The record moves to the **Rejected** tab and the remark is shown to the student.

### My DTR
*Available to: Student.*

**My DTR** is where you record your daily attendance. The system captures the current time and a camera photo for each entry.

1. **Time In:** Click when you arrive at your workstation. A camera window opens; take the photo to register your arrival time.
2. **Time Out:** Click when you leave. Your rendered hours for the day are computed from the time in and time out.
3. **Summary cards:** Total rendered hours, required hours and remaining hours.
4. **Submit for Review:** Sends the day's record to your coordinator and supervisor for approval.
5. **Attendance History table:** Every recorded day, showing the date, time in, time out, rendered hours, attendance status, approval status and photo.
6. **Approval status:** **Not Submitted**, **Awaiting Approval**, **Approved**, or **Rejected**. A rejected record shows the remark so you can correct the issue.
7. **Photo:** Click to view the captured verification image.

> **Make sure your face is clearly visible at time-in,** because the supervisor and coordinator use the photo to verify that the recorded attendance is genuine.

---

## Student Logs
*Available to: Coordinator, Supervisor and Student.*

**Student Logs** (shown as **My Logs** for a Student) contains the narrative entries of daily tasks.

1. **New entry:** Adds a log entry for a day.
2. **Task description:** What was accomplished during the day.
3. **Hours:** The number of hours rendered, which feeds the total in the dashboard.
4. **Edit:** Changes an entry that is still pending. Approved logs cannot be changed.
5. **Log list:** The recorded entries with their dates and hours. A Coordinator or Supervisor sees the logs of the students in their scope; a Student sees only their own.

---

## Requirements and Submissions

The requirements feature has two sides: the **Templates** that define what must be submitted, and the **Submissions** themselves.

### Templates
*Available to: Coordinator (manage), Student (view).*

1. **Template list:** The requirement templates provided for the internship, such as weekly report formats and forms.
2. **Upload / New Template:** *(Coordinator)* Adds a template file with a title and description.
3. **View or Download:** Opens the file so it can be read or downloaded. A Student uses these as the correct format for submissions.
4. **Edit or Remove:** *(Coordinator)* Updates or deletes an existing template.

### Submissions
*Available to: Coordinator, Supervisor and Student.*

1. **Filter:** Narrows the list by student, requirement or status.
2. **Submit Requirement:** *(Student)* Opens the form to upload a completed requirement.
3. **Choose requirement:** *(Student)* Selects which requirement the file is for.
4. **Attach file:** *(Student)* Uploads the finished document.
5. **Submission row:** Shows the student, the requirement and the current status.
6. **Open:** Views the uploaded file.
7. **Grade or Comment:** *(Coordinator and Supervisor)* Records a grade or a remark and marks the submission as reviewed.

---

## Account Management
*Available to: Coordinator.*

**Account Management** lets a Coordinator manage the student accounts in their assigned program.

1. **Students tab:** Lists the students under the coordinator's program.
2. **Search and filters:** Find a student by name, section or status.
3. **Add Student:** Opens the form to create a student account. The email must follow the STI student format, and the program and year level set the student's section.
4. **Student row:** Shows the student's name, email, program, section and account status.
5. **Edit:** Updates the student's details.
6. **Disable:** Stops the student from signing in without deleting the record, and can be reversed later.

> A Coordinator only sees and manages students within the assigned program. Records outside that program are hidden.

---

## Partner Companies
*Available to: Coordinator, Supervisor (view).*

1. **Company list:** The partner companies where students may be deployed.
2. **Company details:** The name, address and contact person of each company.
3. **Add or Edit:** *(Coordinator)* Creates or updates a company record.
4. **Assigned students:** Shows which students are deployed to each company.

---

## Find Company
*Available to: Student.*

1. **Map view:** Shows the partner companies on a map.
2. **Company list:** The same companies as a list, with their address and contact person.
3. **Company details:** Opens a company to see its information and available slots.
4. **Request / Confirm:** Follows the coordinator's instructions to request or confirm a company assignment.

---

## Schedule
*Available to: Student.*

1. **Calendar:** Shows the internship timetable and important dates such as the start and end of the internship.
2. **Deadlines:** Marks the due dates set by the coordinator.
3. **Event details:** Click a date to see what is scheduled for it.

---

## Announcements
*Available to: Coordinator (post), Supervisor and Student (view).*

1. **New Announcement:** *(Coordinator)* Opens the form to post a notice.
2. **Title and message:** The heading and body of the announcement.
3. **Audience:** Chooses who should receive the announcement.
4. **Publish:** Posts the announcement. It then appears on the students' and supervisors' dashboards.
5. **Announcement list:** The posted notices, which can be edited or removed by the coordinator.

---

## Messages
*Available to: Coordinator, Supervisor and Student.*

**Messages** is the in-system chat used to coordinate internship concerns.

1. **Conversation list:** Your chats, with a badge on those that have unread replies.
2. **New conversation:** Starts a chat with a student, supervisor or staff member you are allowed to contact.
3. **Message thread:** The back-and-forth of the selected conversation.
4. **Message box:** Type here and press **Enter** to send. Use **Shift + Enter** for a new line.

---

## Profile
*Available to: Coordinator, Supervisor and Student.*

1. **Photo:** Your profile picture, which can be changed from the allowed file types.
2. **Name and email:** Your account details. Your email follows the school rule and is normally controlled by the administrator.
3. **Program or company:** For a Coordinator, the assigned program; for a Supervisor, the assigned company; for a Student, the program, section and student number.
4. **Editable fields:** Update the details you are allowed to change, such as contact number.
5. **Save:** Stores your changes.

---

## Common Tasks at a Glance

| Task | Role | Where |
| --- | --- | --- |
| Sign in | All | **Log in** → **Log in with Office 365** |
| Record daily attendance | Student | **My DTR** |
| Review and approve DTRs | Coordinator, Supervisor | **Attendance** |
| Submit a requirement | Student | **Submissions** |
| Grade a submission | Coordinator, Supervisor | **Submissions** |
| Add a student account | Coordinator | **Account Management** |
| Post a notice | Coordinator | **Announcements** |
| Browse partner companies | Coordinator, Supervisor | **Partner Companies** |
| Request a company | Student | **Find Company** |
| Send a message | All | **Messages** |

---

## Troubleshooting

| Problem | Solution |
| --- | --- |
| Cannot sign in with Microsoft | Confirm you typed your full school email and are not using a personal Microsoft account. Complete the MFA prompt when it appears. |
| Login failed (AADSTS50011) | You are on the wrong address. Open **https://system-capstones.vercel.app** and sign in there. |
| "Not authorized" after login | Your account may be disabled or not yet activated. Contact the administrator. |
| Camera does not capture on Time In | Allow camera permission in the browser, close any other app using the camera, then reload the page. |
| DTR shows "Rejected" | Open the record to read the remark, correct the issue, and message your coordinator or supervisor. |
| A file will not upload | Confirm the file type and size are allowed, then try again. |

---

*End of Appendix B — User's Guide.*
