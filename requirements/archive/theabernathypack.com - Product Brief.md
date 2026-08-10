# **theabernathypack.com — Product Brief**

# **1\. Project Overview & Vision**

theabernathypack.com is a web application designed for a local community of dog walkers at Abernathy Park in Sandy Springs, GA (while remaining open to general community members). The site enables community members to organize, discover, and join local events, coordinate walks, and interact with fellow dog owners and families.

# **2\. Tech Stack & Infrastructure**

## **2.1 Stack & Hosting (Option D: Hybrid Monolith)**

* Framework: Next.js 14+ (App Router, React, TypeScript, Tailwind CSS, Shadcn UI).  
* Python Tooling: Use uv for package and environment management whenever Python is utilized in the project/scripts.  
* Database: AWS DynamoDB or Serverless PostgreSQL (Neon/Supabase) keeping costs under $5–$10/month.  
* AWS Hosting: AWS App Runner or AWS Lightsail Containers (single container deployed via GitHub Actions).  
* Storage & Email: AWS S3 \+ Nodemailer via theabernathypack@gmail.com.  
* Domain: theabernathypack.com is already registered and has an existing hosted zone in Route53. CloudFormation will need to configure DNS records (ALIAS/CNAME to the hosting service) and an ACM certificate (DNS-validated) for HTTPS.

## **2.2 AWS Infrastructure as Code (IaC) & Naming**

* IaC Tooling: AWS CloudFormation (Strictly CloudFormation / AWS SAM; do NOT use Terraform).  
* Resource Naming Prefix: Use the prefix **aberpack** (e.g., aberpack-stack, aberpack-photos-bucket, aberpack-events-table) **where possible and supported by the AWS resource type**. It is explicitly understood that not all AWS resources or sub-constructs support custom naming prefixes; in those cases, standard or auto-generated AWS names are fully acceptable and Claude Code should not flag or halt execution over them.  
* **AWS Resource Tagging**: All taggable AWS resources (and CloudFormation stack-level default tags) MUST be tagged with **theabernathypack** (e.g., *Project: theabernathypack* or tag key/value *theabernathypack*) to ensure cost tracking, resource grouping, and automated cleanup across the AWS account.

## **2.3 AWS Authentication, Roles & IAM Least Privilege**

* AWS Profile: Local execution uses the AWS profile configured in .env under AWS\_PROFILE (associated with the ashley-dev role).  
* IAM Policy Guidance: Claude Code must follow the principle of Least Privilege. When designing CloudFormation templates or CLI deployment scripts, Claude Code must explicitly specify and list the minimal IAM policy actions/statements required (scoped strictly to *aberpack\** resource ARNs, where applicable) so the user can update the policy attached to their assumed dev role. Standard names are acceptable where the prefix is not supported.

# **3\. Core Data Domain & Relationships**

## **3.1 Profile Architecture & Account Types**

1. Login Profiles:  
   1. Require a valid, unique email address.  
   2. Lifecycle: Cannot be hard-deleted on a whim. Can only be deactivated.  
   3. Relationships with other login accounts or family units can be severed/broken independently (e.g. divorce/separation) without destroying the account.  
2. Regular (Non-Login) Profiles:  
   1. Represent dogs, kids, or partners/family members without login credentials.  
   2. Lifecycle: Ephemeral. Can be deleted at any time by the managing login user.  
   3. Upgrade path: Can include an optional email address field. Clicking "Send Invite" sends an email invitation to convert/attach a new login account to that profile.

## **3.2 Family Units & Relationship Linking**

* Direct Creation: A login user can directly create regular profiles (pets, kids, partners) within their family unit.  
* Peer-to-Peer Connection Requests: A login user can select another existing login user, specify a relationship type, and send a connection request. The link is established only upon recipient approval.  
* Many-to-Many Linking: Supports joint ownership of pets and shared family members across multiple login accounts.

## **3.3 Avatars & Media Guidelines**

* Custom photo uploads supported for human and dog profiles (stored in S3).  
* Default Fallback Avatars: If no custom photo is uploaded, users can select from a curated list of neutral, unbiased generic avatars (distinct sets for humans and dogs).  
* Dog Profile Attributes: Optional photo/avatar, optional breed field. Kept simple and lightweight.

## **3.4 Event Entity**

Each Event contains the following fields:

* Title / Name  
* Description  
* Category  
* Location  
* Date & Time  
* Creator (User Profile)  
* Event Chat: Dedicated discussion thread attached to the event.  
* Interested Parties: List of attending or interested user profiles.

# **4\. Event Specifications & Interaction Rules**

## **4.1 Location Architecture**

Locations are flexible and unbounded (not restricted to Abernathy Park). A Location consists of 3 optional fields; however, at least ONE of the three location fields MUST be populated for an event creation request to be valid:

1. Short Description (Free-text, e.g., "City Springs Lawn", "Abernathy Park Trailhead").  
2. Google Maps Pin (Map URL or geographic coordinate link).  
3. Meetup Spot Details (Free-text specific meeting instructions, e.g., "By the water fountain near the main entrance").

## **4.2 Categories**

* Predefined initial list: Casual Walk, Dog Playdate, Group Hike, Social/Yappy Hour, Community Trip/Outing, Other.  
* When selecting "Other", users can optionally submit a category suggestion.

## **4.3 RSVP & Attendance Rules**

* Restricted to Logged-In Users for Milestone 1\.  
* RSVP Statuses: Going, Interested.  
* Users can change or revoke/de-RSVP their status at any time.

## **4.4 Event Chat & Lifecycle Data Retention**

* Event Chat: Tied to the event, asynchronous messaging model (stored in DB, no real-time WebSockets required in M1).  
* Automated Data Retention & Cleanup: Past events and associated chats are kept in the database for 2 weeks (14 days) after event completion, then automatically purged/cleaned up.  
* Content Moderation: Automated abuse/language moderation flagged for future releases.

## **4.5 Deferred / Future Features**

* Notifications & Reminders: Email/in-app reminders deferred to future milestones.

## **4.6 Secondary Journey: Creating an Event**

* Accessible via a prominent "Create New Event" button.  
* Leads to an intuitive form for entering all event parameters (Name, Description, Category, Location, Time/Date).  
* Allows any registered user to publish events immediately.

# **5\. Navigation, UI Layout, & Site Architecture**

## **5.1 Responsive UI Layout**

* **Desktop View**: Dual-column layout featuring a central Upcoming Events List Feed with a sticky right-sidebar mini-calendar widget. Selecting dates on the mini-calendar filters the main feed.  
* **Mobile View**: Bottom Navigation Bar with 4 primary destinations:  
  * 1\. 🏠 **Feed**: Chronological upcoming event list.  
  * 2\. 📅 **Calendar**: Month grid with daily event indicators.  
  * 3\. ➕ **Create**: Quick event creation modal/form.  
  * 4\. 🐕 **My Pack**: Family unit profiles, pet management, and pending invites.  
* **View Switcher**: Top header control allows seamless toggling between **\[ 📋 Upcoming List \]** (default) and **\[ 📅 Calendar Grid \]** on all viewports.

## **5.2 Application Sitemap & View Specifications**

1. **Home / Events Feed View**: Default view displaying upcoming events prioritized for the next 3–7 days.  
2. **Event Details View**: Displays full description, interactive map link/pin, specific meetup instructions, RSVP buttons (*Going* / *Interested* / *Revoke*), list of attending profiles, and the attached asynchronous discussion thread.  
3. **Create Event Form View**: Input form for Title, Description, Category, Date/Time, and Location (validates that at least 1 of 3 location fields is populated).  
4. **My Pack (Family Unit Management) View**: Interface to view linked profiles, add regular profiles (kids, dogs), trigger email invites (theabernathypack@gmail.com), and respond to peer connection requests.  
5. **Account & Auth Views**: Login, Registration, Password Reset, and Account Deactivation.

# **6\. Scope & Phasing**

* Milestone 1 Core Scope: Local auth, Profile/Family management, Event CRUD & List/Calendar views, Persistent DB on AWS.  
* Future Enhancements: SSO (Google/OAuth), Advanced Chat/Notifications, Media uploads for dog profiles.

# **7\. Developer Workflow, CI/CD, & AI Automation Pipeline (Future Phase)**

To demonstrate modern AI-driven developer workflow patterns for job search / portfolio purposes, the repository and infrastructure will incorporate:

1. **GitHub Repository & Actions**: Version control with structured GitHub Actions for automated linting, testing, and container deployment to AWS.  
2. **In-App Suggestion Box**: Allows users to submit feature requests and category suggestions.  
3. **Jira Integration**: Suggestion submissions automatically generate a Jira issue/ticket via API.  
4. **Claude Code PR Automation**:  
   1. Approved Jira tickets trigger a GitHub Action workflow invoking Claude Code.  
   2. Claude Code reads the specification, generates code/tests, and opens a Pull Request (PR) on GitHub.  
   3. Owner reviews and merges the PR, triggering automatic deployment to AWS via GitHub Actions.

