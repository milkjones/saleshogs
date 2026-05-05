# Sales Hogs CRM — Made For

A real-time dashboard for the Sales Hogs sales operating system.

**Features:**
- Pipeline tracker with $3.6M FY target
- Go Network manager (contact tracking + touchpoints)
- Deal Kanban (Prospect → Won/Lost)
- Daily 15 habit tracker (Tue–Fri logging)
- Roadshow scheduler & cadence tracker

**Data:** All entries persist in browser localStorage. No backend required.

---

## Deploy to Vercel (5 minutes)

### Step 1: Push to GitHub

**1a. Create a GitHub repo**
- Go to [github.com/new](https://github.com/new)
- Name it: `sales-hogs-crm`
- Set to **Public** (easier for Vercel)
- Click **Create repository**

**1b. Download and upload the code**
1. Download the entire `sales-hogs-deploy` folder from this chat (all files)
2. Open Terminal / Command Prompt, navigate to that folder:
   ```bash
   cd path/to/sales-hogs-deploy
   ```
3. Initialize Git and push:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/sales-hogs-crm.git
   git push -u origin main
   ```
   (Replace `YOUR-USERNAME` with your actual GitHub username)

### Step 2: Deploy via Vercel

**2a. Sign up for free at Vercel**
- Go to [vercel.com](https://vercel.com)
- Click **Sign up** (use your GitHub account for faster onboarding)

**2b. Import your GitHub repo**
- Click **New Project**
- Select **Import Git Repository**
- Search for `sales-hogs-crm` and click **Import**
- Framework: **Next.js** (should auto-detect)
- Click **Deploy**

**Done.** Vercel will build and deploy automatically. You'll get a live URL like:
```
https://sales-hogs-crm.vercel.app
```

---

## File Structure

```
sales-hogs-deploy/
├── app/
│   ├── layout.js          # Next.js root layout
│   ├── page.js            # Home page (loads dashboard)
│   ├── dashboard.js       # Main CRM component
│   └── globals.css        # Global styles
├── package.json           # Dependencies
├── next.config.js         # Next.js config
├── .gitignore             # Git ignore rules
└── README.md              # This file
```

---

## Local Development (optional)

If you want to test locally before deploying:

1. **Install Node.js** from [nodejs.org](https://nodejs.org) (v18+)
2. **Install dependencies:**
   ```bash
   cd sales-hogs-deploy
   npm install
   ```
3. **Run dev server:**
   ```bash
   npm run dev
   ```
4. **Open in browser:**
   ```
   http://localhost:3000
   ```

---

## Using the Dashboard

**Pipeline Tab:** Overview of FY target, opps needed, roadshow cadence.

**Go Network Tab:** 
- Filter by hog (Mitch, Kat, Chris, Gab, Matt)
- Log touchpoints ("+ Touchpoint" button)
- Track opps surfaced
- Edit contact details

**Deals Tab:**
- Kanban board across 6 stages
- Add new deals ("+Add Deal")
- Drag stage dropdown to move deals

**Daily 15 Tab:**
- Team consistency grid at top
- Monthly trading-day grid (Tue–Fri only)
- Click past day to log ✓ + optional note

**Roadshows Tab:**
- Cadence tracker (1 every 2 weeks)
- Book new roadshows (min 3 reps)
- Mark complete, log 30/90/365-day follow-ups

---

## Customization

To add real Go Network data, edit `app/dashboard.js`:

Find `seedGoNetwork()` function and replace placeholder names/firms with real contacts.

To change hog names or add/remove team members, edit the `HOGS` array at the top.

---

## Support

Questions? Refer back to the Sales Playbook doc for context on how each piece fits into the operating system.

**Document:** Made_For_Sales_Playbook_FY.docx
