# AWS S3 Offloading & Deployment Guide for Drawbook

This guide contains **ready-to-copy-and-paste settings and commands** tailored specifically for your AWS S3 bucket: `drawbook-016355331017-us-east-1-an` in region `us-east-1`.

---

## 📌 Bucket Information Summary

- **Bucket Name**: `drawbook-016355331017-us-east-1-an`
- **AWS Region**: `us-east-1` (US East - N. Virginia)
- **ARN**: `arn:aws:s3:::drawbook-016355331017-us-east-1-an`
- **S3 Media Base URL**: `https://drawbook-016355331017-us-east-1-an.s3.us-east-1.amazonaws.com`

---

## ⚠️ PREREQUISITE: Turn Off "Block Public Access"

Before AWS S3 will allow you to save a public bucket policy, you **must turn off Block Public Access**:

1. Go to **[Bucket Permissions](https://us-east-1.console.aws.amazon.com/s3/buckets/drawbook-016355331017-us-east-1-an?region=us-east-1&tab=permissions)**.
2. In the **Block public access (bucket settings)** box, click **Edit**.
3. **Uncheck** the box at the top labeled **"Block all public access"**.
4. Click **Save changes**.
5. When prompted, type **`confirm`** in the popup box and click **Confirm**.

---

## Step 1: Bucket Policy & CORS Setup

Now that Block Public Access is turned off, you can save your policy:

### A. Bucket Policy (Allow Public Read)
In the **Bucket Policy** section, click **Edit** and paste this exact JSON policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::drawbook-016355331017-us-east-1-an/*"
    }
  ]
}
```
Click **Save changes**.

### B. CORS Configuration (Cross-Origin Resource Sharing)
Scroll down to **Cross-origin resource sharing (CORS)**, click **Edit** and paste:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": []
  }
]
```
Click **Save changes**.

---

## Step 2: Upload Photo Collections to AWS S3 (Secure Alternatives)

You do **NOT** need to generate long-lived Access Keys to upload your files. Here are the 3 secure, recommended alternatives:

---

### Option A: AWS S3 Web Console Drag-and-Drop (⭐ Most Secure & Easiest)
*No static credentials on disk! Uses your temporary browser MFA session.*

1. Open your S3 Bucket Objects page: **[drawbook-016355331017-us-east-1-an Console](https://us-east-1.console.aws.amazon.com/s3/buckets/drawbook-016355331017-us-east-1-an?region=us-east-1&tab=objects)**.
2. Open Windows File Explorer to your project folder (`C:\Users\NChis\OneDrive\Documents\drawing`).
3. Select the `book1`, `book2`, ..., `book64` folders.
4. **Drag and drop** the folders into the AWS S3 web page.
5. Click **Upload** at the bottom of the page.

---

### Option B: AWS IAM Identity Center / SSO Login (`aws configure sso`)
*AWS industry standard for CLI security. Uses temporary, short-lived tokens.*

1. Run `aws configure sso` in PowerShell.
2. Enter your **SSO start URL** (found in AWS Console under **[IAM Identity Center](https://us-east-1.console.aws.amazon.com/singlesignon/v2/home?region=us-east-1)**, formatted like `https://d-xxxxxxxxxx.awsapps.com/start` or `https://my-org.awsapps.com/start`).
3. Set **SSO Region**: `us-east-1`.
4. Approve the login in your browser and run `.\upload_to_s3.ps1`.

---

### Option C: Temporary Single-Use Access Key (Create -> Upload -> Delete Key)
*If you don't have SSO enabled, use a temporary Access Key and delete it immediately after upload.*

1. Create a temporary Access Key in **[AWS Security Credentials](https://us-east-1.console.aws.amazon.com/iam/home#/security_credentials)**.
2. Run `aws configure` in PowerShell and enter the keys.
3. Run `.\upload_to_s3.ps1` to upload your folders.
4. **Delete the Access Key immediately** in AWS Console right after uploading! Once deleted, the key is permanently destroyed and cannot be compromised.

---

### Option C: Cyberduck (Free Desktop S3 Client)
*Free open-source GUI tool for Windows.*

1. Download [Cyberduck](https://cyberduck.io/).
2. Click **Open Connection** -> Select **Amazon S3**.
3. Log in with your temporary AWS console session or single-use credentials.
4. Drag and drop your folders into Cyberduck to upload.

---

## Step 3: Web App S3 URL Configuration

Your web application is already pre-configured in `js/config.js` to use:
`https://drawbook-016355331017-us-east-1-an.s3.us-east-1.amazonaws.com`

If you ever need to test or override this URL in your browser:
1. Open the website.
2. Click the **S3 Storage Icon** in the top header.
3. Paste `https://drawbook-016355331017-us-east-1-an.s3.us-east-1.amazonaws.com` and click **Save S3 Settings**.

---

## Step 4: Clean Git History for GitHub & AWS Amplify

Your `.git` index has already untracked the `book*` folders so your local 20GB photo files remain safe. Run these commands to finalize your lightweight repository for GitHub and Amplify:

### 1. Stage and commit site changes:
```bash
git add .gitignore index.html styles.css js/ upload_to_s3.ps1 AWS_S3_SETUP_GUIDE.md
git commit -m "Offload 20GB media to S3 bucket drawbook-016355331017-us-east-1-an"
```

### 2. Create a clean lightweight deployment branch (drops repo size from 10.5 GB to 6 MB):
```bash
git checkout --orphan main-deploy
git add index.html styles.css js/ drawbook_logo.png .gitignore upload_to_s3.ps1 AWS_S3_SETUP_GUIDE.md
git commit -m "Initial release with S3 media storage"
```

---

## Step 5: Push to GitHub & Deploy to AWS Amplify

1. **Push to GitHub**:
   ```bash
   git push -u origin main-deploy:main --force
   ```
2. **Deploy in AWS Amplify Console**:
   - Go to **[AWS Amplify Console](https://console.aws.amazon.com/amplify)**.
   - Select your `drawbook` app (or click **Host web app** -> Connect GitHub repository).
   - Select branch `main`.
   - Click **Save and Deploy**.

Your site deployment will build cleanly in less than 1 minute!
