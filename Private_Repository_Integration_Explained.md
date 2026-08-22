# How We Access Private Repositories in DevRisk AI

**Overview**
For our project, we needed a way to run our ML predictions on private GitHub repositories. Since the code is private, we can't just fetch it normally. Here is the simple 3-step approach we implemented to make this work securely and practically.

---

### Step 1: Listening for Events (Webhooks + ngrok)
First, we need to know exactly when someone creates a Pull Request (PR).
- We set up a **GitHub Webhook** in the private repository. This automatically sends an HTTP POST request whenever a PR is opened.
- Since we are running our Node.js server locally for development, GitHub can't reach our localhost directly. To fix this, we use **ngrok**. It creates a temporary public URL that catches the webhook and forwards it to our local server.
- **Security Check:** To make sure no one sends fake requests to our ngrok URL, we set a Secret Key in GitHub. GitHub signs the payload using **HMAC-SHA256**. Our server checks this signature and rejects the request if it doesn't match.

### Step 2: Authenticating (GitHub PAT)
The webhook tells us a PR was opened, but for security, it doesn't include the actual private source code. To fetch the code, we need to authenticate.
- We generate a **Personal Access Token (PAT)** from our GitHub account.
- We strictly give this token **"Read-Only"** access to the repository. This way, our system can only read the code and cannot accidentally modify or delete anything in the project.

### Step 3: Fetching the Code Changes
Once our Node.js server receives and verifies the webhook, we fetch the code:
- The server extracts the PR number and repository details from the webhook data.
- It makes an HTTP GET request to the GitHub REST API to get the changed files (diffs).
- We pass our PAT in the header as a `Bearer Token` (like `Authorization: Bearer <our_token>`).
- GitHub verifies our token and returns the JSON data containing the code changes.
- Finally, our system passes these diffs to our Python ML model to predict the PR risk score.

---

### Why This is Practical
This approach is very doable for our project. We don't need any complex network setups or paid enterprise tools. By using free tools like ngrok for local testing and standard GitHub PATs for authentication, we can securely analyze private code exactly how standard CI/CD pipelines do it in the industry.
