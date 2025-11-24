# Test Environment Management System - Data Setup Guide

## 🎯 Getting Started: Data Creation Mind Map

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    START: Fresh TEMS Installation                       │
│                    (All Demo Data Deleted)                              │
└────────────────────────┬────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    STEP 1: USER MANAGEMENT                              │
│                    📋 Priority: HIGHEST                                 │
│                    ⏱️  Time: 5-10 minutes                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1.1 Create Admin Account (if not exists)                              │
│      └─► Settings → User Management → Add User                         │
│          • Role: Admin                                                  │
│          • Email: admin@company.com                                     │
│          • Full Name: System Administrator                              │
│          • Department: IT                                               │
│                                                                          │
│  1.2 Create Manager Accounts                                            │
│      └─► Settings → User Management → Add User                         │
│          • Role: Manager                                                │
│          • Can approve bookings                                         │
│          • Can manage environments                                      │
│                                                                          │
│  1.3 Create Regular User Accounts                                       │
│      └─► Settings → User Management → Add User                         │
│          • Role: User                                                   │
│          • Can create bookings                                          │
│          • Can view environments                                        │
│                                                                          │
│  ⚠️  DEPENDENCY: None (This is the starting point)                     │
│  ✅  OUTPUT: User accounts for team members                            │
└────────────────────────┬────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    STEP 2: COMPONENTS LIBRARY                           │
│                    📋 Priority: HIGH                                    │
│                    ⏱️  Time: 15-30 minutes                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  2.1 Identify Application Components                                    │
│      • Frontend applications                                            │
│      • Backend services                                                 │
│      • Databases                                                        │
│      • Third-party integrations                                         │
│                                                                          │
│  2.2 Create Components                                                  │
│      └─► Components → Add Component                                     │
│                                                                          │
│      Example 1: Frontend Component                                      │
│      ┌──────────────────────────────────────┐                          │
│      │ Name: Customer Portal UI             │                          │
│      │ Type: frontend                       │                          │
│      │ Technology: React 18                 │                          │
│      │ Version: 2.5.0                       │                          │
│      │ Repository: github.com/org/portal    │                          │
│      │ Dependencies: None                   │                          │
│      └──────────────────────────────────────┘                          │
│                                                                          │
│      Example 2: Backend API                                             │
│      ┌──────────────────────────────────────┐                          │
│      │ Name: User Service API               │                          │
│      │ Type: backend                        │                          │
│      │ Technology: Node.js + Express        │                          │
│      │ Version: 3.2.1                       │                          │
│      │ Repository: github.com/org/user-api  │                          │
│      │ Dependencies: PostgreSQL DB          │                          │
│      └──────────────────────────────────────┘                          │
│                                                                          │
│      Example 3: Database                                                │
│      ┌──────────────────────────────────────┐                          │
│      │ Name: PostgreSQL DB                  │                          │
│      │ Type: database                       │                          │
│      │ Technology: PostgreSQL 15            │                          │
│      │ Version: 15.3                        │                          │
│      │ Port: 5432                           │                          │
│      │ Dependencies: None                   │                          │
│      └──────────────────────────────────────┘                          │
│                                                                          │
│  ⚠️  DEPENDENCY: Users (Step 1)                                        │
│  ✅  OUTPUT: Component library for environment deployment              │
└────────────────────────┬────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    STEP 3: TEST ENVIRONMENTS                            │
│                    📋 Priority: HIGH                                    │
│                    ⏱️  Time: 20-45 minutes                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  3.1 Plan Environment Hierarchy                                         │
│      Development → QA → Staging → UAT → Production                      │
│                                                                          │
│  3.2 Create Environments                                                │
│      └─► Environments → Add Environment                                 │
│                                                                          │
│      Priority Order:                                                    │
│      1. Development Environment (dev-01)                                │
│      2. QA Environment (qa-01)                                          │
│      3. Staging Environment (staging-01)                                │
│      4. UAT Environment (uat-01)                                        │
│                                                                          │
│      For Each Environment:                                              │
│      ┌──────────────────────────────────────┐                          │
│      │ Name: QA Environment 01              │                          │
│      │ Type: qa                             │                          │
│      │ Status: available                    │                          │
│      │ URL: https://qa01.company.com        │                          │
│      │ Description: QA testing environment  │                          │
│      │ Capacity: 10 concurrent users        │                          │
│      │ Region: us-east-1                    │                          │
│      └──────────────────────────────────────┘                          │
│                                                                          │
│  3.3 Add Configuration Variables                                        │
│      └─► Environment Details → Configurations Tab                       │
│          • DATABASE_URL                                                 │
│          • API_KEY                                                      │
│          • FEATURE_FLAGS                                                │
│          • LOG_LEVEL                                                    │
│                                                                          │
│  3.4 Deploy Components to Environments                                  │
│      └─► Environment Details → Components Tab → Deploy Component       │
│          • Select component                                             │
│          • Set deployment status                                        │
│          • Configure port/endpoint                                      │
│          • Add deployment notes                                         │
│                                                                          │
│  ⚠️  DEPENDENCY: Components (Step 2)                                   │
│  ✅  OUTPUT: Configured test environments ready for booking            │
└────────────────────────┬────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    STEP 4: RELEASES & VERSIONS                          │
│                    📋 Priority: MEDIUM                                  │
│                    ⏱️  Time: 10-20 minutes                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  4.1 Create Release                                                     │
│      └─► Releases → Add Release                                         │
│                                                                          │
│      Example Release:                                                   │
│      ┌──────────────────────────────────────┐                          │
│      │ Name: Sprint 24 Release              │                          │
│      │ Version: 2.4.0                       │                          │
│      │ Type: minor                          │                          │
│      │ Status: planned                      │                          │
│      │ Target Date: 2025-12-01              │                          │
│      │ Release Manager: John Doe            │                          │
│      │ Release Notes: New features...       │                          │
│      └──────────────────────────────────────┘                          │
│                                                                          │
│  4.2 Add Components to Release                                          │
│      └─► Release Details → Components Tab                               │
│          • Select components included in release                        │
│          • Specify component versions                                   │
│                                                                          │
│  4.3 Plan Environment Testing                                           │
│      └─► Release Details → Environments Tab                             │
│          • dev-01: Unit Testing                                         │
│          • qa-01: Integration Testing                                   │
│          • staging-01: System Testing                                   │
│          • uat-01: User Acceptance Testing                              │
│                                                                          │
│  ⚠️  DEPENDENCY: Components (Step 2), Environments (Step 3)            │
│  ✅  OUTPUT: Release plans ready for deployment tracking               │
└────────────────────────┬────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    STEP 5: ENVIRONMENT BOOKINGS                         │
│                    📋 Priority: HIGH (For Daily Operations)            │
│                    ⏱️  Time: 5-10 minutes per booking                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  5.1 Create Booking                                                     │
│      └─► Bookings → Create Booking                                      │
│                                                                          │
│      Booking Details:                                                   │
│      ┌──────────────────────────────────────┐                          │
│      │ Environment: QA Environment 01       │                          │
│      │ Project: Customer Portal Testing     │                          │
│      │ Release: Sprint 24 Release (opt)     │                          │
│      │ Purpose: API integration testing     │                          │
│      │ Priority: high                       │                          │
│      │ Start Time: 2025-11-25 09:00         │                          │
│      │ End Time: 2025-11-25 17:00           │                          │
│      │ Status: pending (awaits approval)    │                          │
│      └──────────────────────────────────────┘                          │
│                                                                          │
│  5.2 Booking Workflow                                                   │
│      User Creates → Manager Approves → Status: Approved                 │
│      → Start Time Reached → Status: Active                              │
│      → End Time Reached → Status: Completed                             │
│                                                                          │
│  5.3 Handle Conflicts                                                   │
│      • System auto-detects overlapping bookings                         │
│      • View conflicts in Bookings → Conflicts tab                       │
│      • Resolve by adjusting times or priorities                         │
│                                                                          │
│  ⚠️  DEPENDENCY: Environments (Step 3), Users (Step 1)                │
│  ✅  OUTPUT: Scheduled environment usage                               │
└────────────────────────┬────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│            STEP 6: INTEGRATIONS (Optional but Recommended)              │
│                    📋 Priority: MEDIUM                                  │
│                    ⏱️  Time: 15-30 minutes                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  6.1 Configure Jira Integration                                         │
│      └─► Integrations → Jira Cloud Tab                                  │
│                                                                          │
│      Required Information:                                              │
│      ┌──────────────────────────────────────┐                          │
│      │ Jira URL: https://company.jira.com   │                          │
│      │ Email: automation@company.com        │                          │
│      │ API Token: [Generate in Jira]        │                          │
│      │ Project Key: PROJ                    │                          │
│      └──────────────────────────────────────┘                          │
│                                                                          │
│      Steps to Generate Jira API Token:                                 │
│      1. Go to Jira → Profile → Security                                │
│      2. Create API token                                                │
│      3. Copy token and save in TEMS                                     │
│                                                                          │
│  6.2 Configure GitLab Integration                                       │
│      └─► Integrations → GitLab Tab                                      │
│                                                                          │
│      Required Information:                                              │
│      ┌──────────────────────────────────────┐                          │
│      │ GitLab URL: https://gitlab.com       │                          │
│      │ Personal Access Token: [Generate]    │                          │
│      │ Project ID: 12345                    │                          │
│      └──────────────────────────────────────┘                          │
│                                                                          │
│      Steps to Generate GitLab Token:                                   │
│      1. GitLab → Preferences → Access Tokens                            │
│      2. Create token with api, read_api scopes                         │
│      3. Copy token and save in TEMS                                     │
│                                                                          │
│  6.3 Test Connections                                                   │
│      • Click "Test & Save Connection" button                            │
│      • Verify success message                                           │
│                                                                          │
│  ⚠️  DEPENDENCY: Jira/GitLab accounts with appropriate permissions     │
│  ✅  OUTPUT: Automated deployment tracking and issue management        │
└────────────────────────┬────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│            STEP 7: MONITORING & NOTIFICATIONS (Optional)                │
│                    📋 Priority: LOW                                     │
│                    ⏱️  Time: 10-15 minutes                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  7.1 Configure Email Notifications                                      │
│      • Booking confirmations                                            │
│      • Booking reminders (24h, 1h before)                               │
│      • Conflict notifications                                           │
│      • Environment status changes                                       │
│                                                                          │
│  7.2 Set Up Monitoring                                                  │
│      └─► Monitoring → Real-Time Monitoring                              │
│          • View environment health                                      │
│          • Track active bookings                                        │
│          • Monitor system metrics                                       │
│                                                                          │
│  7.3 Configure Alerts                                                   │
│      • Environment unavailability                                       │
│      • Booking conflicts                                                │
│      • Deployment failures                                              │
│                                                                          │
│  ⚠️  DEPENDENCY: Environments (Step 3), Email server configuration     │
│  ✅  OUTPUT: Proactive monitoring and alerts                           │
└────────────────────────┬────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    ✅ SETUP COMPLETE!                                   │
│                    System Ready for Production Use                      │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Dependency Flow Chart

```
┌─────────────┐
│   STEP 1    │
│    USERS    │ ◄──────────────────┐
└──────┬──────┘                    │
       │                           │
       │ (Users needed to create   │
       │  other resources)         │
       ▼                           │
┌─────────────┐                    │
│   STEP 2    │                    │
│ COMPONENTS  │                    │
└──────┬──────┘                    │
       │                           │
       │ (Components needed        │
       │  to deploy)               │
       ▼                           │
┌─────────────┐                    │
│   STEP 3    │ ───────────────────┤
│ ENVIRONMENTS│                    │
└──────┬──────┘                    │
       │                           │
       ├───────────────────┐       │
       │                   │       │
       ▼                   ▼       │
┌─────────────┐    ┌─────────────┐│
│   STEP 4    │    │   STEP 5    ││
│  RELEASES   │    │  BOOKINGS   ││
└──────┬──────┘    └─────────────┘│
       │                           │
       │ (Optional but             │
       │  recommended)             │
       ▼                           │
┌─────────────┐                    │
│   STEP 6    │                    │
│INTEGRATIONS │ ───────────────────┘
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   STEP 7    │
│ MONITORING  │
└─────────────┘
```

---

## 🔄 Data Relationship Diagram

```
                    ┌──────────────┐
                    │    USERS     │
                    │ (id, role)   │
                    └───────┬──────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
              ▼             ▼             ▼
      ┌─────────────┐ ┌──────────┐ ┌──────────┐
      │ COMPONENTS  │ │  ENVS    │ │ BOOKINGS │
      │ (id, name)  │ │(id,type) │ │(id,user) │
      └──────┬──────┘ └────┬─────┘ └────┬─────┘
             │             │             │
             │      ┌──────┼──────┐      │
             │      │      │      │      │
             └──────┼──────┘      │      │
                    │             │      │
                    ▼             ▼      │
           ┌────────────────┐ ┌─────────┴──────┐
           │ ENV_COMPONENTS │ │ RELEASE_ENVS   │
           │  (deployment)  │ │  (test_phase)  │
           └────────────────┘ └────────┬───────┘
                                       │
                                       ▼
                                ┌──────────────┐
                                │   RELEASES   │
                                │ (id, version)│
                                └──────────────┘
```

---

## 📝 Quick Start Checklist

### Minimal Setup (15 minutes)
- [ ] Create 1 admin user
- [ ] Create 2-3 regular users
- [ ] Create 1 component (your main app)
- [ ] Create 1 environment (dev or QA)
- [ ] Deploy component to environment
- [ ] Create 1 test booking

### Standard Setup (45 minutes)
- [ ] Create admin + 2 managers + 5 users
- [ ] Create 5-10 components (frontend, backend, databases)
- [ ] Create 3 environments (dev, qa, staging)
- [ ] Deploy components to all environments
- [ ] Create 1 release with components
- [ ] Link release to environments
- [ ] Create 3-5 bookings
- [ ] Configure Jira or GitLab integration

### Complete Setup (2 hours)
- [ ] All users with proper roles
- [ ] All application components documented
- [ ] Full environment hierarchy (dev→qa→staging→uat→prod)
- [ ] Components deployed to appropriate environments
- [ ] Multiple releases planned
- [ ] Regular booking schedule
- [ ] Both Jira and GitLab integrated
- [ ] Monitoring and alerts configured
- [ ] Network topology verified
- [ ] Access permissions set

---

## 🎯 Common Scenarios

### Scenario 1: New Project Onboarding
**Order:** Users → Components → Environments → Bookings → Integrations

### Scenario 2: Adding New Environment
**Order:** Create Environment → Deploy Components → Update Configurations → Create Bookings

### Scenario 3: New Release Deployment
**Order:** Create Release → Add Components → Plan Testing → Link to Environments → Track in Jira

### Scenario 4: Team Expansion
**Order:** Create Users → Assign Roles → Grant Environment Access → Train on Booking Process

---

## ⚡ Pro Tips

1. **Start Small**: Begin with 1 environment and expand as needed
2. **Use Templates**: Save component configurations for reuse
3. **Naming Conventions**: Use consistent naming (env-type-number format)
4. **Documentation**: Add detailed descriptions to all resources
5. **Regular Cleanup**: Archive old releases and completed bookings
6. **Automation**: Leverage Jira/GitLab integrations for efficiency
7. **Monitoring**: Check the dashboard daily for conflicts and issues
8. **Backup**: Regular database backups before major changes

---

## 🆘 Troubleshooting

### "Can't create booking"
→ Ensure environment exists and is in 'available' status

### "Component deployment failed"
→ Check if component exists and environment is accessible

### "Jira integration not working"
→ Verify API token is valid and has correct permissions

### "Booking conflicts"
→ Use the Conflicts view to identify and resolve overlapping bookings

### "Can't see environments"
→ Check user role and environment access permissions

---

## 📚 Additional Resources

- **Dashboard**: Real-time view of system status
- **Analytics**: Historical data and trends
- **Network Topology**: Visual representation of environment-component relationships
- **Deployment Tracking**: Monitor releases across environments
- **Reports**: Generate deployment and usage reports

---

**Last Updated**: November 24, 2025  
**Version**: 1.0  
**For**: Test Environment Management System (TEMS)
