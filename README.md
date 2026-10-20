# 🎙️ LevelUp: AI Voice Interview Simulator

> **The complete, non-technical guide to running the AI Voice Interview simulator on your computer in just a few minutes.** No programming knowledge or command line experience required!

---

## 🌟 What is this App?

**LevelUp** is an interactive, voice-driven AI interview preparation platform. It simulates real-world technical and behavioral job interviews:
1. **Resume Analysis**: Upload your resume (PDF/Word), and the system automatically extracts your skills and projects.
2. **Company Tier Roadmap**: Progress through realistic interview rounds—from Startups (Tier 1) to Mid-tier companies (Tier 2) and Tech Giants like Google & Meta (Tier 3).
3. **Voice Interview Room**: An AI interviewer asks you targeted questions out loud, listens to your spoken answers in real-time, and follows up dynamically.
4. **Instant Score & Feedback Report**: Get a breakdown of your technical accuracy, communication skills, confidence, and tailored recommendations on what to improve.

---

## ⚡ The 3-Minute Quick Start (If you already have prerequisites)

If you already have **Python**, **Node.js**, and **MongoDB** installed:

### On Windows:
👉 **Double-click `run.bat`** in this folder!
> That's it! It automatically sets up the environment, downloads all required packages, starts the servers, and opens the application in your browser.

### On Mac or Linux:
1. Open the **Terminal** app.
2. Drag and drop this project folder into the terminal or navigate to it.
3. Type:
   ```bash
   chmod +x run.sh && ./run.sh
   ```
4. Press **Enter**.

---

## 📥 Complete First-Time Setup Guide (Step-by-Step)

If this is your first time setting up software like this on your computer, simply follow these **3 easy installation steps** before running `run.bat`.

---

### Step 1: Install Python (Free)

1. Go to the official Python download page: [python.org/downloads](https://www.python.org/downloads/)
2. Click the big yellow button: **"Download Python 3.x"**.
3. Run the downloaded installer file.
4. ⚠️ **VERY IMPORTANT (DO NOT MISS THIS):**
   - At the bottom of the first setup screen, **check the box** that says:
     ☑️ **"Add python.exe to PATH"** (or "Add Python to environment variables").
   - Then click **"Install Now"**.
5. Once complete, click **Close**.

---

### Step 2: Install Node.js (Free)

1. Go to [nodejs.org](https://nodejs.org/).
2. Click the button labeled **"LTS (Recommended for Most Users)"**.
3. Run the downloaded installer file (`.msi` on Windows or `.pkg` on Mac).
4. Click **Next** through the installation wizard using the default settings, then click **Finish**.

---

### Step 3: Install MongoDB Community Server (Free Database)

MongoDB is the database where your candidate profile, interview records, and scores are securely stored on your computer.

1. Go to the MongoDB download page: [mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)
2. Under "MongoDB Community Server", click the green **"Download"** button (Package: `msi` for Windows, or standard installer for Mac).
3. Run the installer:
   - Choose **"Complete"** setup.
   - Keep the checkbox checked: ☑️ **"Install MongoDB as a Service"** (this ensures it runs automatically in the background).
   - *(Optional)* You can uncheck "Install MongoDB Compass" if you don't need a database viewer, or leave it checked.
4. Click **Next** and **Install**, then click **Finish**.

---

## 🚀 Running the Project

Now that the 3 tools are installed:

1. Open this folder in **File Explorer** (Windows) or **Finder** (Mac).
2. **Double-click `run.bat`** (Windows) or execute `./run.sh` (Mac/Linux).
3. You will see a command window open. It will automatically:
   - Verify Python and Node.js are ready.
   - Check your MongoDB connection.
   - Install all required Python and Frontend packages automatically (this may take 1-2 minutes the very first time).
   - Start the backend and frontend services.
4. After a few seconds, your default web browser will automatically open to:
   👉 **`https://localhost:5173`**

---

## 🔒 Important: Handling the Browser "Security Warning" Screen

When the app opens, your browser (Chrome, Edge, Brave, or Safari) might display a screen saying:

> ⚠️ **"Your connection isn't private"** (or *"Warning: Potential Security Risk Ahead"*)

### Why does this happen?
Don't worry! This is completely normal and 100% safe.
The application creates a secure local HTTPS link (`https://localhost:5173`) specifically so your browser allows the **microphone** to work during the AI interview. Because this is running locally on your own computer and not a commercial public website, the certificate is self-generated.

### How to bypass it in 2 clicks:

#### On Google Chrome or Microsoft Edge:
1. Click the button that says **"Advanced"** (or "Show Advanced").
2. Click the link at the bottom: **"Proceed to localhost (unsafe)"** or **"Continue to localhost"**.

#### On Mozilla Firefox:
1. Click **"Advanced..."**.
2. Click **"Accept the Risk and Continue"**.

#### On Safari:
1. Click **"Show Details"**.
2. Click **"visit this website"** and confirm.

The app will immediately load!

---

## 🎮 How to Use the Application

Once the app is open in your browser:

### 1. Create an Account
- Click **"Register"** or **"Create Account"**.
- Enter your Name, Email, and Password, then click **Sign Up**.
- *(All information stays on your personal machine).*

### 2. Upload Your Resume
- In the top navigation bar, click **"Resume"**.
- Drag and drop your resume (`.pdf` or `.docx`).
- Click **"Parse Resume"**.
- The AI will inspect your resume, calculate an ATS compatibility score, and extract your top skills, job titles, and experiences.

### 3. Choose a Company & Interview Round
- Go to the **"Companies"** roadmap page.
- You will see 3 tiers:
  - **Tier 1: High-Growth Startups** (Unlocked immediately)
  - **Tier 2: Mid-tier & Scale-ups** (Unlocked as you score well in Tier 1)
  - **Tier 3: Tech Giants** (FAANG / Big Tech companies)
- Select a company (e.g., Stripe, Uber, Google) and click **"Start Interview"**.

### 4. Enter the AI Voice Interview Room
- When prompted, click **"Allow"** to grant browser microphone permissions.
- You will see the AI Interviewer and real-time audio visualization.
- **Listen** as the interviewer asks questions.
- **Speak** your answers clearly into your microphone.
- The AI will transcribe your speech, think, and respond with thoughtful follow-up questions.
- When finished, click **"End Interview"**.

### 5. Review Your Performance Report
- An in-depth evaluation will automatically generate:
  - **Overall Score** (0–100)
  - **Technical Knowledge & Depth**
  - **Communication & Clarity**
  - **Strengths & Areas for Improvement**
  - **Specific recommendations** on what topics or skills to practice next.

---

## 📱 Bonus: Practicing on Your Phone or Tablet

Want to practice on your smartphone as if you are on a real phone call or video interview?

1. Make sure your phone is connected to the **same Wi-Fi network** as your computer.
2. Look at the text in the launcher window on your computer. You will see a line like:
   ```text
   Phone / Network Web App: https://192.168.x.x:5173
   ```
3. Open your mobile browser (Safari or Chrome on your phone) and type that exact address (including `https://`).
4. Tap **"Advanced"** -> **"Proceed to site"** to accept the local certificate.
5. You can now do voice interviews directly on your phone!

---

## 🛑 How to Stop or Exit the Application

When you are done practicing:
1. Simply close the browser tab.
2. To stop the background servers, close the two command prompt windows titled:
   - `AI Voice Interview - Backend`
   - `AI Voice Interview - Frontend`
   *(or press `Ctrl + C` inside them)*.

---

## ⚙️ AI Models & API Key Settings (Optional)

Out of the box, the system is configured to work automatically with default free AI and browser voice synthesis. 

If you ever want to switch to your own custom AI keys (like OpenAI ChatGPT, Anthropic Claude, or Google Gemini):
1. Navigate to the `backend` folder.
2. Open the file named `.env` using **Notepad** (or any text editor).
3. Fill in your preferred API key, for example:
   ```env
   # Example: Using your own Gemini or OpenAI key
   OPENAI_API_KEY=your_key_here
   GEMINI_API_KEY=your_key_here
   ```
4. Save and close the file. Restart `run.bat` to apply changes.

---

## ❓ Troubleshooting & Frequently Asked Questions

<details>
<summary><b>1. Error: "Python 3 is not found in PATH"</b></summary>

- **Why:** Python was installed without enabling the environment variable checkbox.
- **Fix:** Run the Python installer again, choose **"Modify"**, click **Next**, and ensure the checkbox **"Add Python to environment variables"** is checked. Then restart `run.bat`.
</details>

<details>
<summary><b>2. Error: "Node.js is not found in PATH"</b></summary>

- **Fix:** Download and install Node.js LTS from [nodejs.org](https://nodejs.org/). Make sure you restart your computer or restart the command window after installing.
</details>

<details>
<summary><b>3. Warning: "Could not connect to MongoDB on port 27017"</b></summary>

- **Why:** MongoDB server is not running on your machine.
- **Fix:** 
  1. Press `Windows Key + R`, type `services.msc`, and press **Enter**.
  2. Find **"MongoDB Server"** in the list.
  3. Right-click it and choose **"Start"**.
  4. (If MongoDB is not installed, follow Step 3 above).
</details>

<details>
<summary><b>4. The browser says "Microphone blocked" or won't hear me</b></summary>

- **Fix:**
  1. In your browser's address bar, look at the left side next to `https://localhost:5173` and click the **Lock / Tune icon** (Site Settings).
  2. Set **Microphone** to **"Allow"**.
  3. Refresh the page (`F5` or `Ctrl + R`).
</details>

<details>
<summary><b>5. "Port 8000 or 5173 is already in use"</b></summary>

- **Fix:** An old session might still be running.
  - On Windows: Open Task Manager (`Ctrl + Shift + Esc`), look for any lingering `python.exe` or `node.exe` processes, right-click and select **"End task"**. Then run `run.bat` again.
</details>

---

## 💡 Summary of Quick Links

| Tool | Purpose | Download Link |
| :--- | :--- | :--- |
| **Python 3.10+** | Runs backend server & AI logic | [python.org/downloads](https://www.python.org/downloads/) |
| **Node.js 18+** | Runs interactive user interface | [nodejs.org](https://nodejs.org/) |
| **MongoDB Community** | Stores candidate profiles & interview logs | [mongodb.com/try/download/community](https://www.mongodb.com/try/download/community) |

---

*Enjoy practicing for your interviews! If you have any questions, feel free to ask for assistance.*
