# Firebase Setup Instructions

## Step 1: Create a Firebase Project

1. Go to [firebase.google.com](https://firebase.google.com/)
2. Click **"Get Started"** or sign in with your Google account
3. Click **"Create a project"**
4. **Project name**: `learning-tracker`
5. Click **Create project**
6. Wait for the project to be created (1-2 minutes)

## Step 2: Create a Web App

1. In Firebase Console, you should see options for different platforms
2. Click the **Web icon** `</>`
3. **App name**: `learning-tracker-app`
4. Check both boxes (Hosting is optional)
5. Click **Register app**
6. **IMPORTANT**: Copy the config object that appears - you'll need this!

It should look like:
```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123def456"
};
```

7. Click **Continue to console**

## Step 3: Enable Authentication

1. In Firebase Console, go to **Authentication** (left sidebar)
2. Click **Get started**
3. Click **Email/Password** provider
4. Toggle **Enable** 
5. Click **Save**

## Step 4: Create Firestore Database

1. In Firebase Console, go to **Firestore Database** (left sidebar)
2. Click **Create database**
3. Choose **Start in production mode**
4. Select your region (closest to you)
5. Click **Create**
6. Click **Start collection**
7. Collection ID: `entries`
8. Click **Next**
9. Auto ID → click **Save**

You can ignore the document - we'll create them programmatically.

## Step 5: Set Security Rules

1. In Firestore Database, go to **Rules** tab
2. Replace the default rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow users to read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
    
    // Allow entries if user is authenticated
    match /entries/{document=**} {
      allow read, write: if request.auth != null;
    }
    
    // Allow learners if user is authenticated
    match /learners/{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

3. Click **Publish**

## Step 6: Update Your App

Replace the Firebase config in your `index.html` with your actual config from Step 2.

Find this section in the HTML:
```javascript
// Firebase Configuration - REPLACE WITH YOUR CONFIG
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123def456"
};
```

And replace it with your actual config from Step 2.

## Step 7: Deploy to GitHub Pages (Optional)

Once you push to GitHub:
1. Go to your GitHub repo Settings → Pages
2. Select "main" branch
3. Your app will be live at: `https://yourusername.github.io/learning-tracker/`

---

## Troubleshooting

### "Firebase is not defined"
- Make sure the Firebase CDN link is in your HTML (check the script tags)

### "Permission denied" errors
- Check your Firestore security rules (Step 5)
- Make sure you're logged in

### "User not authenticated"
- Click "Sign Up" first to create an account
- Then log in

---

## Next Steps

1. ✅ Complete all 6 steps above
2. ✅ Get your Firebase config
3. ✅ Update the HTML file with your config
4. ✅ Push to GitHub
5. ✅ Test by signing up and adding data
6. ✅ Share the link with your friend!

Your friend can then sign up with their own account and you'll both see the shared data in real-time!
